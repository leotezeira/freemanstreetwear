import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSiteContent } from "@/lib/services/content.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const MAX_HERO_IMAGE_BYTES = Number(process.env.MAX_HERO_IMAGE_BYTES ?? String(5 * 1024 * 1024));
const MAX_HERO_IMAGE_WIDTH = Number(process.env.MAX_HERO_IMAGE_WIDTH ?? "1800");
const HERO_IMAGE_WEBP_QUALITY = Number(process.env.HERO_IMAGE_WEBP_QUALITY ?? "84");
const HERO_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getFileExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  return fileName.slice(dot + 1).trim().toLowerCase();
}

function inferMimeType(file: File) {
  if (file.type && HERO_ALLOWED_MIME_TYPES.has(file.type)) {
    return file.type;
  }
  const ext = getFileExtension(file.name || "");
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Validate all text fields first
    const heroTitle = String(formData.get("heroTitle") ?? "").trim();
    const heroSubtitle = String(formData.get("heroSubtitle") ?? "").trim();
    const heroCtaLabel = String(formData.get("heroCtaLabel") ?? "").trim();
    const heroCtaHref = String(formData.get("heroCtaHref") ?? "/shop").trim();
    const topBarText = String(formData.get("topBarText") ?? "").trim();
    const promoTitle = String(formData.get("promoTitle") ?? "").trim();
    const promoSubtitle = String(formData.get("promoSubtitle") ?? "").trim();
    const newsletterTitle = String(formData.get("newsletterTitle") ?? "").trim();
    const newsletterSubtitle = String(formData.get("newsletterSubtitle") ?? "").trim();

    if (!heroTitle) return NextResponse.json({ error: "Título hero es requerido" }, { status: 400 });
    if (!heroSubtitle) return NextResponse.json({ error: "Subtítulo hero es requerido" }, { status: 400 });
    if (!heroCtaLabel) return NextResponse.json({ error: "Texto CTA es requerido" }, { status: 400 });
    if (!promoTitle) return NextResponse.json({ error: "Título promo es requerido" }, { status: 400 });
    if (!promoSubtitle) return NextResponse.json({ error: "Subtítulo promo es requerido" }, { status: 400 });
    if (!newsletterTitle) return NextResponse.json({ error: "Título newsletter es requerido" }, { status: 400 });
    if (!newsletterSubtitle) return NextResponse.json({ error: "Subtítulo newsletter es requerido" }, { status: 400 });
    // topBarText es opcional

    const current = await getSiteContent({ resolveStorageUrls: false });
    let heroImageUrl = current.home.heroImageUrl;

    const heroImageFile = formData.get("heroImageFile");
    if (heroImageFile instanceof File && heroImageFile.size > 0) {
      const mime = inferMimeType(heroImageFile);
      if (!mime) {
        return NextResponse.json({ error: "Formato de imagen no soportado. Usá JPG, PNG o WEBP." }, { status: 400 });
      }

      if (heroImageFile.size > MAX_HERO_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `La imagen hero supera el máximo de ${MAX_HERO_IMAGE_BYTES / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminClient();
      const fileName = `${crypto.randomUUID()}.webp`;
      const path = `content/home/hero/${fileName}`;

      try {
        const rawBuffer = Buffer.from(await heroImageFile.arrayBuffer());

        // Process image with fallback
        let webpBuffer: Buffer;
        try {
          webpBuffer = await sharp(rawBuffer)
            .rotate()
            .resize({ width: MAX_HERO_IMAGE_WIDTH, withoutEnlargement: true })
            .webp({ quality: HERO_IMAGE_WEBP_QUALITY })
            .toBuffer();
        } catch {
          // Fallback: process without rotate
          webpBuffer = await sharp(rawBuffer)
            .resize({ width: MAX_HERO_IMAGE_WIDTH, withoutEnlargement: true })
            .webp({ quality: HERO_IMAGE_WEBP_QUALITY })
            .toBuffer();
        }

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(path, webpBuffer, { contentType: "image/webp", upsert: false });

        if (uploadError) {
          return NextResponse.json({ error: `No se pudo subir la imagen: ${uploadError.message}` }, { status: 500 });
        }

        heroImageUrl = `storage:${path}`;
      } catch (imgError) {
        const msg = imgError instanceof Error ? imgError.message : "Error desconocido";
        return NextResponse.json({ error: `Error al procesar imagen: ${msg}` }, { status: 500 });
      }
    }

    // Build payload
    const payload: Record<string, string> = {
      topBarText,
      heroTitle,
      heroSubtitle,
      heroCtaLabel,
      heroCtaHref,
      heroImageUrl,
      promoTitle,
      promoSubtitle,
      newsletterTitle,
      newsletterSubtitle,
    };

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("site_content").upsert({ key: "home_content", value: payload }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: `Error al guardar: ${error.message}` }, { status: 500 });
    }

    revalidatePath("/");
    revalidatePath("/admin/panel-admin/content");

    return NextResponse.json({ ok: true, message: "Home actualizada correctamente" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
