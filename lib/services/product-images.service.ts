import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const SIGNED_URL_TTL_SECONDS = Number(process.env.PRODUCT_IMAGES_SIGNED_URL_TTL_SECONDS ?? "3600");

export async function createSignedProductImageUrl(imagePath: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw new Error(`Failed to sign image url: ${error.message}`);
  }

  return data.signedUrl;
}
