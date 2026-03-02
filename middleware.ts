import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

function decodeBase64(input: string) {
  if (typeof atob === "function") {
    return atob(input);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "base64").toString("utf8");
  }
  return "";
}

function unauthorizedBasicAuth() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
    },
  });
}

function isValidBasicAuth(request: NextRequest) {
  const username = process.env.ADMIN_BASIC_USER ?? process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_BASIC_PASS ?? process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  const decoded = decodeBase64(encoded);
  const sepIndex = decoded.indexOf(":");
  if (sepIndex < 0) return false;

  const providedUser = decoded.slice(0, sepIndex);
  const providedPass = decoded.slice(sepIndex + 1);
  return providedUser === username && providedPass === password;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Early return for static assets or public routes
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname.endsWith("favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApiRoute = pathname === "/api/admin" || pathname.startsWith("/api/admin/");

  if (isAdminRoute || isAdminApiRoute) {
    if (!isValidBasicAuth(request)) {
      return unauthorizedBasicAuth();
    }
    return NextResponse.next();
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const supabase = createMiddlewareClient(request, NextResponse.next());

  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
    ]);

    if (result && typeof result === "object" && "data" in result && "error" in result) {
      const { data, error } = result as { data: any; error: any };

      if (process.env.DEBUG_AUTH === "1") {
        const cookieNames = request.cookies.getAll().map((c) => c.name);
        const hasSbCookie = cookieNames.some((n) => n.startsWith("sb-"));
        console.log("[auth][mw]", {
          path: pathname,
          hasSbCookie,
          cookieCount: cookieNames.length,
          hasUser: Boolean(data?.user),
          error: error?.message ?? null,
        });
      }
    }
  } catch (err) {
    console.error("[middleware] Error in Supabase auth check", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

