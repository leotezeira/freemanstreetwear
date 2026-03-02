import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as any;
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: existing, error: readError } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "categories")
      .maybeSingle();
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const current = ((existing?.value as string[] | null) ?? []).filter(Boolean);
    const next = Array.from(new Set([...current, name].map((c) => c.trim()).filter(Boolean)));

    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "categories", value: next }, { onConflict: "key" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/admin/panel-admin/categories");
    revalidatePath("/admin/panel-admin/products");

    return NextResponse.json({ ok: true, categories: next });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
