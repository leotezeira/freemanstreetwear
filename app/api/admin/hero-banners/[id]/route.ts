import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const contentType = request.headers.get("content-type") ?? "";
    const updates: Record<string, unknown> = {};
    let uploadedImagePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");

      if (file instanceof File && file.size > 0) {
        const rawBuffer = Buffer.from(await file.arrayBuffer());

        let webpBuffer: Buffer;
        try {
          webpBuffer = await sharp(rawBuffer)
            .rotate()
            .resize({ width: 1920, height: 600, fit: "cover", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        } catch {
          webpBuffer = await sharp(rawBuffer)
            .resize({ width: 1920, height: 600, fit: "cover", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        }

        const path = `hero-banners/${crypto.randomUUID()}.webp`;
        const supabase = getSupabaseAdminClient();
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, webpBuffer, {
          contentType: "image/webp",
          upsert: false,
        });

        if (uploadError) throw new Error(uploadError.message);
        uploadedImagePath = path;
      }

      const field = (key: string) => {
        const value = form.get(key);
        return value === null ? undefined : String(value);
      };

      if (field("is_active") !== undefined) updates.is_active = field("is_active") === "true";
      if (field("sort_order") !== undefined) updates.sort_order = Number(field("sort_order"));
      if (field("title") !== undefined) updates.title = field("title") || null;
      if (field("subtitle") !== undefined) updates.subtitle = field("subtitle") || null;
      if (field("cta_label") !== undefined) updates.cta_label = field("cta_label") || null;
      if (field("cta_href") !== undefined) updates.cta_href = field("cta_href") || null;
      if (field("title_font") !== undefined) updates.title_font = field("title_font") || null;
      if (field("subtitle_font") !== undefined) updates.subtitle_font = field("subtitle_font") || null;
      if (field("text_color") !== undefined) updates.text_color = field("text_color") || null;
      if (field("cta_text_color") !== undefined) updates.cta_text_color = field("cta_text_color") || null;
      if (field("cta_bg_color") !== undefined) updates.cta_bg_color = field("cta_bg_color") || null;
      if (field("zoom") !== undefined) updates.zoom = Number(field("zoom"));
      if (field("overlay_top") !== undefined) updates.overlay_top = Number(field("overlay_top"));
      if (field("overlay_bottom") !== undefined) updates.overlay_bottom = Number(field("overlay_bottom"));
    } else {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return NextResponse.json({ error: "Body invalido" }, { status: 400 });

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
      if ("zoom" in body) updates.zoom = Number(body.zoom);
      if ("overlay_top" in body) updates.overlay_top = Number(body.overlay_top);
      if ("overlay_bottom" in body) updates.overlay_bottom = Number(body.overlay_bottom);
    }

    if (uploadedImagePath) {
      updates.image_path = uploadedImagePath;
    }

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
