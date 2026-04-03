import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Body invalido" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if ("is_active" in body) updates.is_active = Boolean(body.is_active);
    if ("sort_order" in body) updates.sort_order = Number(body.sort_order);
    if ("title" in body) updates.title = (body.title as string | null) ?? null;
    if ("subtitle" in body) updates.subtitle = (body.subtitle as string | null) ?? null;
    if ("cta_label" in body) updates.cta_label = (body.cta_label as string | null) ?? null;
    if ("cta_href" in body) updates.cta_href = (body.cta_href as string | null) ?? null;
    if ("title_font" in body) updates.title_font = (body.title_font as string | null) ?? null;
    if ("subtitle_font" in body) updates.subtitle_font = (body.subtitle_font as string | null) ?? null;
    if ("text_color" in body) updates.text_color = (body.text_color as string | null) ?? null;
    if ("cta_text_color" in body) updates.cta_text_color = (body.cta_text_color as string | null) ?? null;
    if ("cta_bg_color" in body) updates.cta_bg_color = (body.cta_bg_color as string | null) ?? null;

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("hero_banners").update(updates).eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { data } = await supabase.from("hero_banners").select("image_path").eq("id", id).single();

    if (data?.image_path) {
      try {
        await supabase.storage.from(BUCKET).remove([data.image_path]);
      } catch {
        // best-effort; continue with row deletion
      }
    }

    const { error } = await supabase.from("hero_banners").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
