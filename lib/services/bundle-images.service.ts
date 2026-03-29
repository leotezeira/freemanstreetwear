import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const PRODUCT_IMAGES_SIGNED_URL_TTL_SECONDS = Number(
  process.env.PRODUCT_IMAGES_SIGNED_URL_TTL_SECONDS ?? "3600"
);

/**
 * Genera URL firmada para imagen de bundle (usa el mismo bucket que productos)
 * @param imagePath - Path relativo ej: "bundles/abc123.webp"
 * @returns URL firmada
 */
export async function createSignedBundleImageUrl(imagePath: string): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrl(imagePath, PRODUCT_IMAGES_SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("[createSignedBundleImageUrl] Error:", error);
    throw error;
  }

  return data.signedUrl;
}
