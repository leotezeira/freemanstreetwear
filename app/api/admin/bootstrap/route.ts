import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type BootstrapPayload = {
  email?: string;
  secret?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BootstrapPayload;
    const email = body.email?.trim().toLowerCase();
    const secret = body.secret?.trim();

    if (!email || !secret) {
      return NextResponse.json({ error: "Email and secret are required" }, { status: 400 });
    }

    if (!process.env.ADMIN_BOOTSTRAP_SECRET) {
      return NextResponse.json({ error: "ADMIN_BOOTSTRAP_SECRET is not configured" }, { status: 500 });
    }

    if (secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const foundUser = usersData.users.find((user) => user.email?.toLowerCase() === email);

    if (!foundUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: insertError } = await supabase
      .from("admins")
      .upsert({ id: foundUser.id, email }, { onConflict: "email" });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId: foundUser.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
