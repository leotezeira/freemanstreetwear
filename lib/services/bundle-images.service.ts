import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUNDLE_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const BUNDLE_IMAGES_SIGNED_URL_TTL_SECONDS = Number(
  process.env.PRODUCT_IMAGES_SIGNED_URL_TTL_SECONDS ?? "3600"
);

/**
 * Genera URL firmada para imagen de bundle
 * @param imagePath - Path relativo ej: "bundles/abc123.webp"
 * @returns URL firmada
 */
export async function createSignedBundleImageUrl(imagePath: string): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(BUNDLE_IMAGES_BUCKET)
    .createSignedUrl(imagePath, BUNDLE_IMAGES_SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("[createSignedBundleImageUrl] Error:", error);
    throw error;
  }

  return data.signedUrl;
}
