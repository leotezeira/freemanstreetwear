import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const BUNDLES_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const MAX_IMAGE_BYTES = Number(process.env.MAX_BUNDLE_IMAGE_BYTES ?? String(5 * 1024 * 1024)); // 5MB
const MAX_IMAGE_WIDTH = Number(process.env.MAX_BUNDLE_IMAGE_WIDTH ?? "1600");
const WEBP_QUALITY = Number(process.env.BUNDLE_IMAGE_WEBP_QUALITY ?? "82");

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
    throw new Error(`Error al subir la imagen: ${uploadError.message}`);
  }

  // Obtener URL firmada
  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .createSignedUrl(filePath, 3600 * 24 * 30); // 30 días

  if (urlError) {
    throw new Error(`Error al generar URL: ${urlError.message}`);
  }

  return urlData.signedUrl;
}

export async function deleteBundleImage(imagePath: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  
  // Extraer el path del archivo de la URL
  const pathParts = imagePath.split("/");
  const fileName = pathParts[pathParts.length - 1];
  
  if (!fileName) return;

  const { error } = await supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .remove([fileName]);

  if (error) {
    console.error("[deleteBundleImage] Error:", error);
  }
}

export async function createSignedBundleImageUrl(imagePath: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  
  // Extraer el path del archivo de la URL
  const pathParts = imagePath.split("/");
  const fileName = pathParts[pathParts.length - 1];
  
  if (!fileName) return imagePath;

  const { data, error } = await supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .createSignedUrl(fileName, 3600); // 1 hora

  if (error) {
    console.error("[createSignedBundleImageUrl] Error:", error);
    return imagePath;
  }

  return data.signedUrl;
}
