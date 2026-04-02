// =====================================================
// SERVICIO DE IMÁGENES DE BUNDLES
// =====================================================

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Validar variables de entorno
const BUNDLE_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET;
if (!BUNDLE_IMAGES_BUCKET) {
  console.warn("[bundle-images.service] BUNDLE_IMAGES_BUCKET no está definida, usando 'bundle-images'");
}

const BUCKET_NAME = BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const BUNDLE_IMAGES_SIGNED_URL_TTL_SECONDS = Number(
  process.env.PRODUCT_IMAGES_SIGNED_URL_TTL_SECONDS ?? "3600"
);

// Log de configuración al iniciar (solo en desarrollo)
if (process.env.NODE_ENV === "development") {
  console.log("[bundle-images.service] Configuración:", {
    bucket: BUCKET_NAME,
    ttl: BUNDLE_IMAGES_SIGNED_URL_TTL_SECONDS,
  });
}

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
  
  // Validar que el path sea relativo correcto
  if (!imagePath.startsWith('bundles/')) {
    console.error("[createSignedBundleImageUrl] Path inválido (debe empezar con 'bundles/'):", imagePath);
    return null;
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(imagePath, BUNDLE_IMAGES_SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[createSignedBundleImageUrl] Storage error:", {
        bucket: BUCKET_NAME,
        imagePath,
        error: error.message,
      });
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("[createSignedBundleImageUrl] Unexpected error:", {
      bucket: BUCKET_NAME,
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
