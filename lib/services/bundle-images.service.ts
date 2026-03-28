import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const BUNDLES_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const MAX_IMAGE_BYTES = Number(process.env.MAX_BUNDLE_IMAGE_BYTES ?? String(5 * 1024 * 1024)); // 5MB
const MAX_IMAGE_WIDTH = Number(process.env.MAX_BUNDLE_IMAGE_WIDTH ?? "1600");
const WEBP_QUALITY = Number(process.env.BUNDLE_IMAGE_WEBP_QUALITY ?? "82");

/**
 * Sube una imagen de bundle a Supabase Storage y devuelve SOLO el filePath
 * @param formData - FormData con el campo "image"
 * @returns filePath ej: "bundles/abc123.webp"
 */
export async function uploadBundleImage(formData: FormData): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const imageFile = formData.get("image") as File;
  if (!imageFile) {
    throw new Error("No se proporcionó ninguna imagen");
  }

  // Validar tamaño
  if (imageFile.size > MAX_IMAGE_BYTES) {
    throw new Error(`La imagen no puede superar los ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
  }

  // Validar tipo
  if (!imageFile.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen válida");
  }

  // Convertir a WebP y optimizar
  const rawBuffer = Buffer.from(await imageFile.arrayBuffer());
  const webpBuffer = await sharp(rawBuffer)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // Generar nombre único
  const fileName = `${crypto.randomUUID()}.webp`;
  const filePath = `bundles/${fileName}`;

  // Subir a Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .upload(filePath, webpBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadBundleImage] Upload error:", uploadError);
    throw new Error(`Error al subir la imagen: ${uploadError.message}`);
  }

  // VERIFICACIÓN POST-SUBIDA: Confirmar que el archivo existe
  try {
    const { data: statData, error: statError } = await supabase.storage
      .from(BUNDLES_IMAGES_BUCKET)
      .info(filePath);

    if (statError || !statData) {
      console.error("[uploadBundleImage] Verification failed:", statError);
      // Intentar limpiar el archivo fallido
      await supabase.storage.from(BUNDLES_IMAGES_BUCKET).remove([filePath]);
      throw new Error("El archivo se subió pero no se pudo verificar. Reintentá la subida.");
    }

    console.log("[uploadBundleImage] File uploaded and verified:", {
      filePath,
      size: statData.size,
      contentType: statData.contentType,
    });
  } catch (verifyError) {
    console.error("[uploadBundleImage] Verification error:", verifyError);
    throw new Error("Error al verificar la subida. Reintentá.");
  }

  // Devolver SOLO el filePath (NO URL firmada)
  return filePath;
}

/**
 * Elimina una imagen de bundle del storage
 * @param filePath - Path del archivo ej: "bundles/abc123.webp"
 */
export async function deleteBundleImage(filePath: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  if (!filePath) return;

  const { error } = await supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("[deleteBundleImage] Error:", error);
  }
}

/**
 * Genera una URL firmada para una imagen de bundle
 * @param filePath - Path del archivo ej: "bundles/abc123.webp"
 * @returns URL firmada o null si hay error
 */
export async function createSignedBundleImageUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase.storage
      .from(BUNDLES_IMAGES_BUCKET)
      .createSignedUrl(filePath, 3600 * 24 * 30); // 30 días

    if (error) {
      console.error("[createSignedBundleImageUrl] Error generating signed URL:", {
        filePath,
        error: error.message,
        statusCode: error.status,
      });
      return null;
    }

    if (!data.signedUrl) {
      console.error("[createSignedBundleImageUrl] No signedUrl returned:", { filePath });
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error("[createSignedBundleImageUrl] Exception:", {
      filePath,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/**
 * Obtiene URL pública para un bucket público
 * @param filePath - Path del archivo ej: "bundles/abc123.webp"
 * @returns URL pública
 */
export function getBundleImagePublicUrl(filePath: string): string {
  if (!filePath) return "";

  const supabase = getSupabaseAdminClient();
  const { data } = supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
