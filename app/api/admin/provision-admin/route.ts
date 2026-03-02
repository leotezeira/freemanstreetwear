import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ProvisionAdminPayload = {
  email?: string;
  password?: string;
  secret?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProvisionAdminPayload;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const secret = body.secret?.trim();

    if (!email || !password || !secret) {
      return NextResponse.json({ error: "Email, password and secret are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (!process.env.ADMIN_BOOTSTRAP_SECRET) {
      return NextResponse.json({ error: "ADMIN_BOOTSTRAP_SECRET is not configured" }, { status: 500 });
    }

    if (secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    let userId: string | null = null;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const message = createError.message.toLowerCase();

      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (usersError) {
          return NextResponse.json({ error: usersError.message }, { status: 500 });
        }

        const found = usersData.users.find((user) => (user.email ?? "").toLowerCase() === email);

        if (!found) {
          return NextResponse.json({ error: "User already exists but could not be found" }, { status: 500 });
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(found.id, {
          password,
        });

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        userId = found.id;
      } else {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
    } else {
      userId = created.user?.id ?? null;
    }

    const { error: adminInsertError } = await supabase
      .from("admins")
      .upsert({ email }, { onConflict: "email" });

    if (adminInsertError) {
      return NextResponse.json({ error: adminInsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
