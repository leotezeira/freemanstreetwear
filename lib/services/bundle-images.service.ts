// =====================================================
// SERVICIO DE IMÁGENES DE BUNDLES
// =====================================================

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUNDLE_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const BUNDLE_IMAGES_SIGNED_URL_TTL_SECONDS = Number(
  process.env.PRODUCT_IMAGES_SIGNED_URL_TTL_SECONDS ?? "3600"
);

/**
 * Genera URL firmada para imagen de bundle
 * @param imagePath - Path relativo ej: "bundles/abc123.webp"
 * @returns URL firmada o null si falla
 */
export async function createSignedBundleImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  
  // Si ya es URL firmada (empieza con http), retornarla directamente
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase.storage
      .from(BUNDLE_IMAGES_BUCKET)
      .createSignedUrl(imagePath, BUNDLE_IMAGES_SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[createSignedBundleImageUrl] Storage error:", {
        bucket: BUNDLE_IMAGES_BUCKET,
        imagePath,
        error: error.message,
      });
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("[createSignedBundleImageUrl] Unexpected error:", {
      bucket: BUNDLE_IMAGES_BUCKET,
      imagePath,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

/**
 * Genera URLs firmadas para múltiples imágenes de bundle
 */
export async function createSignedBundleImageUrls(
  images: Array<{ image_path: string; is_primary: boolean; sort_order: number }>
): Promise<Array<{ url: string; is_primary: boolean; sort_order: number }>> {
  const results = await Promise.all(
    images.map(async (img) => ({
      url: await createSignedBundleImageUrl(img.image_path) ?? img.image_path,
      is_primary: img.is_primary,
      sort_order: img.sort_order,
    }))
  );
  
  return results;
}
