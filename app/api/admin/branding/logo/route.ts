import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const BUCKET = "branding";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      return NextResponse.json({ error: "Formato inválido. Usá PNG, JPG, WEBP o SVG" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    let buffer: Buffer;
    const isSvg = file.type === "image/svg+xml";

    if (isSvg) {
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const raw = Buffer.from(await file.arrayBuffer());
      buffer = await sharp(raw)
        .resize({ height: 120, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
    }

    const ext = isSvg ? "svg" : "webp";
    const path = `logo/logo-${Date.now()}.${ext}`;
    const contentType = isSvg ? "image/svg+xml" : "image/webp";

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    // Guardar la URL pública en site_content
    await supabase
      .from("site_content")
      .upsert({ key: "logo_url", value: urlData.publicUrl }, { onConflict: "key" });

    return NextResponse.json({ ok: true, url: urlData.publicUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}