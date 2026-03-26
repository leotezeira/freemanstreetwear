import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUNDLES_IMAGES_BUCKET = "bundle-images";
const MAX_IMAGE_BYTES = 5242880; // 5MB
const MAX_IMAGE_WIDTH = 1600;
const WEBP_QUALITY = 82;

export async function uploadBundleImage(file: FormData): Promise<string> {
  const supabase = getSupabaseAdminClient();
  
  const imageFile = file.get("image") as File;
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

  // Generar nombre único
  const fileExt = imageFile.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  // Subir a Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Error al subir la imagen: ${uploadError.message}`);
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(BUNDLES_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
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
