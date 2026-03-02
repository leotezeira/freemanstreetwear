import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") ?? "recovery";
  const next = url.searchParams.get("next") ?? "/";

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/auth?mode=login", url.origin));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });

  if (error) {
    return NextResponse.redirect(new URL(`/auth?mode=login&error=${encodeURIComponent(error.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
