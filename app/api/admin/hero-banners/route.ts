import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAllBanners, getBannerSettings, saveBannerSettings } from "@/lib/services/hero-banners.service";

export const runtime = "nodejs";

const BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getFileExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  return fileName.slice(dot + 1).trim().toLowerCase();
}

function inferMimeType(file: File) {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  const ext = getFileExtension(file.name || "");
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "";
}

export async function GET() {
  try {
    const [banners, settings] = await Promise.all([getAllBanners(), getBannerSettings()]);
    return NextResponse.json({ banners, settings });
  } catch {
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const action = String(form.get("action") ?? "create");

    if (action === "settings") {
      const interval_ms = Number(form.get("interval_ms") ?? 5000);
      await saveBannerSettings({ interval_ms: clamp(interval_ms, 2000, 30000) });
      return NextResponse.json({ ok: true });
    }

    const file = form.get("image");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });
    }

    const mime = inferMimeType(file);
    if (!mime) {
      return NextResponse.json({ error: "Formato no soportado. Usa JPG, PNG o WEBP." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagen demasiado grande (max 5MB)" }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      webpBuffer = await sharp(rawBuffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    }

    const path = `hero-banners/${crypto.randomUUID()}.webp`;
    const supabase = getSupabaseAdminClient();

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, webpBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { count } = await supabase.from("hero_banners").select("id", { count: "exact", head: true });

    const { data: banner, error: insertError } = await supabase
      .from("hero_banners")
      .insert({
        title: String(form.get("title") ?? "").trim() || null,
        subtitle: String(form.get("subtitle") ?? "").trim() || null,
        cta_label: String(form.get("cta_label") ?? "").trim() || null,
        cta_href: String(form.get("cta_href") ?? "").trim() || null,
        image_path: path,
        sort_order: count ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ banner });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
