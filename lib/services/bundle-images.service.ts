import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const BUNDLES_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_IMAGE_WIDTH = 1600;

/**
 * Sube una imagen de bundle a Supabase Storage y devuelve SOLO el filePath
 * @param formData - FormData con el campo "image" (legacy, usar API directamente)
 * @returns filePath ej: "bundles/abc123.webp"
 * @deprecated Usar API /api/admin/bundles/[id]/images directamente
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

  // Convertir a PNG y optimizar
  const rawBuffer = Buffer.from(await imageFile.arrayBuffer());
  const pngBuffer = await sharp(rawBuffer)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .png({ quality: 90, compressionLevel: 6 })
    .toBuffer();

  // Generar nombre único
  const fileName = `${crypto.randomUUID()}.png`;
  const filePath = `bundles/${fileName}`;

  // Subir a Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .upload(filePath, pngBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Error al subir la imagen: ${uploadError.message}`);
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
      console.error("[createSignedBundleImageUrl] Error:", error);
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error("[createSignedBundleImageUrl] Exception:", e);
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

/**
 * Obtiene imágenes de un bundle con URLs firmadas
 * @param bundleId - ID del bundle
 * @returns Array de imágenes con URLs firmadas
 */
export async function getBundleImages(bundleId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundle_images")
    .select("*")
    .eq("bundle_id", bundleId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getBundleImages] Error:", error);
    return [];
  }

  // Generar URLs firmadas para cada imagen
  const imagesWithUrls = await Promise.all(
    (data ?? []).map(async (img: any) => ({
      ...img,
      image_url: img.image_path ? await createSignedBundleImageUrl(img.image_path) : null,
    }))
  );

  return imagesWithUrls;
}

/**
 * Obtiene la imagen principal de un bundle
 * @param bundleId - ID del bundle
 * @returns URL de la imagen principal o null
 */
export async function getBundlePrimaryImageUrl(bundleId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundle_images")
    .select("image_path")
    .eq("bundle_id", bundleId)
    .eq("is_primary", true)
    .single();

  if (error || !data) {
    // Fallback: obtener la primera imagen por sort_order
    const { data: fallbackData } = await supabase
      .from("bundle_images")
      .select("image_path")
      .eq("bundle_id", bundleId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!fallbackData?.image_path) return null;
    return createSignedBundleImageUrl(fallbackData.image_path);
  }

  return createSignedBundleImageUrl(data.image_path);
}
