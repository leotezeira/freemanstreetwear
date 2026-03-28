import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

// Usamos el mismo bucket que los productos (ya configurado y funciona)
const BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_IMAGE_WIDTH = 1600;

/**
 * Sube una imagen de bundle al bucket product-images/bundles/
 * @param formData - FormData con el campo "image"
 * @returns filePath relativo ej: "bundles/abc123.png"
 */
export async function uploadBundleImage(formData: FormData): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const imageFile = formData.get("image") as File;
  if (!imageFile) {
    throw new Error("No se proporcionó ninguna imagen");
  }

  console.log("[uploadBundleImage] File received:", {
    name: imageFile.name,
    size: imageFile.size,
    type: imageFile.type,
  });

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

  // Generar nombre único en carpeta bundles/
  const fileName = `bundles/${crypto.randomUUID()}.png`;
  console.log("[uploadBundleImage] Generated fileName:", fileName);

  // Subir a Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, pngBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadBundleImage] Upload error:", uploadError);
    throw new Error(`Error al subir la imagen: ${uploadError.message}`);
  }

  console.log("[uploadBundleImage] Upload successful:", fileName);
  // Devolver SOLO el filePath relativo (igual que product_images)
  return fileName;
}

/**
 * Genera URL firmada para imagen de bundle (usa el mismo sistema que productos)
 * @param filePath - Path relativo ej: "bundles/abc123.png"
 * @returns URL firmada o null
 */
export async function createSignedBundleImageUrl(filePath: string | null): Promise<string | null> {
  if (!filePath) {
    console.log("[createSignedBundleImageUrl] No filePath provided");
    return null;
  }
  
  // Si ya es URL absoluta (viejo sistema), retornar directo
  if (filePath.startsWith("http")) {
    console.log("[createSignedBundleImageUrl] Returning absolute URL:", filePath.substring(0, 50) + "...");
    return filePath;
  }

  console.log("[createSignedBundleImageUrl] Generating signed URL for:", filePath);
  
  const supabase = getSupabaseAdminClient();
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600 * 24 * 30); // 30 días
    
    if (error) {
      console.error("[createSignedBundleImageUrl] Supabase error:", error);
      return null;
    }
    
    console.log("[createSignedBundleImageUrl] Signed URL generated:", data.signedUrl.substring(0, 80) + "...");
    return data.signedUrl;
  } catch (e) {
    console.error("[createSignedBundleImageUrl] Exception:", e);
    return null;
  }
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
