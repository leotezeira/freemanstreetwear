import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

async function upsertSiteContent(key: string, value: unknown) {
  "use server";

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("site_content").upsert({ key, value }, { onConflict: "key" });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/panel-admin/content");
  return { ok: true as const };
}

async function updateHomeContent(formData: FormData) {
  "use server";
  try {
    // Validate all text fields first
    const heroTitle = String(formData.get("heroTitle") ?? "").trim();
    const heroSubtitle = String(formData.get("heroSubtitle") ?? "").trim();
    const heroCtaLabel = String(formData.get("heroCtaLabel") ?? "").trim();
    const heroCtaHref = String(formData.get("heroCtaHref") ?? "/shop").trim();
    const promoTitle = String(formData.get("promoTitle") ?? "").trim();
    const promoSubtitle = String(formData.get("promoSubtitle") ?? "").trim();
    const newsletterTitle = String(formData.get("newsletterTitle") ?? "").trim();
    const newsletterSubtitle = String(formData.get("newsletterSubtitle") ?? "").trim();

    if (!heroTitle) throw new Error("Título hero es requerido");
    if (!heroSubtitle) throw new Error("Subtítulo hero es requerido");
    if (!heroCtaLabel) throw new Error("Texto CTA es requerido");
    if (!promoTitle) throw new Error("Título promo es requerido");
    if (!promoSubtitle) throw new Error("Subtítulo promo es requerido");
    if (!newsletterTitle) throw new Error("Título newsletter es requerido");
    if (!newsletterSubtitle) throw new Error("Subtítulo newsletter es requerido");

    const current = await getSiteContent({ resolveStorageUrls: false });
    let heroImageUrl = current.home.heroImageUrl;

    const heroImageFile = formData.get("heroImageFile");
    if (heroImageFile instanceof File && heroImageFile.size > 0) {
      const mime = inferMimeType(heroImageFile);
      if (!mime) {
        throw new Error("Formato de imagen no soportado. Usá JPG, PNG o WEBP.");
      }

      if (heroImageFile.size > MAX_HERO_IMAGE_BYTES) {
        throw new Error(`La imagen hero supera el máximo de ${MAX_HERO_IMAGE_BYTES / 1024 / 1024}MB`);
      }

      const supabase = getSupabaseAdminClient();
      const fileName = `${crypto.randomUUID()}.webp`;
      const path = `content/home/hero/${fileName}`;

      try {
        const rawBuffer = Buffer.from(await heroImageFile.arrayBuffer());
        
        // Process image with better error handling
        let webpBuffer: Buffer;
        try {
          webpBuffer = await sharp(rawBuffer)
            .rotate() // auto-rotate based on EXIF
            .resize({ width: MAX_HERO_IMAGE_WIDTH, withoutEnlargement: true })
            .webp({ quality: HERO_IMAGE_WEBP_QUALITY })
            .toBuffer();
        } catch (sharpErr) {
          // If rotate fails, try without it
          webpBuffer = await sharp(rawBuffer)
            .resize({ width: MAX_HERO_IMAGE_WIDTH, withoutEnlargement: true })
            .webp({ quality: HERO_IMAGE_WEBP_QUALITY })
            .toBuffer();
        }

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(path, webpBuffer, { contentType: "image/webp", upsert: false });

        if (uploadError) {
          throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
        }

        heroImageUrl = `storage:${path}`;
      } catch (imgError) {
        const msg = imgError instanceof Error ? imgError.message : "Error al procesar imagen";
        throw new Error(`Error con la imagen hero: ${msg}`);
      }
    }

    // Build payload
    const payload: Record<string, string> = {
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

    const result = await upsertSiteContent("home_content", payload);
    if (!result.ok) {
      throw new Error(result.error);
    }

    redirect("/admin/panel-admin/content?saved=1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar Home";
    redirect(`/admin/panel-admin/content?error=${encodeURIComponent(message)}`);
  }
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  const [content, params] = await Promise.all([
    getSiteContent(),
    searchParams ?? Promise.resolve<{ saved?: string; error?: string }>({}),
  ]);
  const saved = params?.saved === "1";
  const error = params?.error ? String(params.error) : null;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Editar Home</h1>
      <p className="text-slate-600">Actualizá hero, banners y newsletter de la landing principal.</p>

      {saved ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Home actualizada correctamente.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <form action={updateHomeContent} className="card-base grid gap-3" encType="multipart/form-data">
        <input name="heroTitle" defaultValue={content.home.heroTitle} className="input-base" placeholder="Título hero" required />
        <textarea
          name="heroSubtitle"
          defaultValue={content.home.heroSubtitle}
          className="input-base min-h-20"
          placeholder="Subtítulo hero"
          required
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input name="heroCtaLabel" defaultValue={content.home.heroCtaLabel} className="input-base" placeholder="Texto CTA" required />
          <input name="heroCtaHref" defaultValue={content.home.heroCtaHref} className="input-base" placeholder="Link CTA" required />
        </div>

        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Imagen hero (subir desde tu dispositivo)</label>
        <input name="heroImageFile" type="file" accept="image/png,image/jpeg,image/webp" className="input-base" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Si subís una imagen nueva, reemplaza automáticamente la actual.</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
          <img src={content.home.heroImageUrl} alt="Preview hero" className="h-44 w-full object-cover" loading="lazy" />
        </div>

        <input name="promoTitle" defaultValue={content.home.promoTitle} className="input-base" placeholder="Título promo" required />
        <input name="promoSubtitle" defaultValue={content.home.promoSubtitle} className="input-base" placeholder="Subtítulo promo" required />
        <input name="newsletterTitle" defaultValue={content.home.newsletterTitle} className="input-base" placeholder="Título newsletter" required />
        <input
          name="newsletterSubtitle"
          defaultValue={content.home.newsletterSubtitle}
          className="input-base"
          placeholder="Subtítulo newsletter"
          required
        />

        <button className="btn-primary w-full md:w-auto" type="submit">
          Guardar Home
        </button>
      </form>
    </section>
  );
}
