import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

// Usamos el MISMO bucket que los productos
const BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_IMAGE_WIDTH = 1600;

/**
 * Sube una imagen de bundle (igual que productos)
 * @param formData - FormData con el campo "image"
 * @returns filePath relativo ej: "bundles/abc123.png"
 */
export async function uploadBundleImage(formData: FormData): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const imageFile = formData.get("image") as File;
  if (!imageFile) {
    throw new Error("No se proporcionó ninguna imagen");
  }

  if (imageFile.size > MAX_IMAGE_BYTES) {
    throw new Error(`La imagen no puede superar los ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
  }

  if (!imageFile.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen válida");
  }

  // Convertir a PNG
  const rawBuffer = Buffer.from(await imageFile.arrayBuffer());
  const pngBuffer = await sharp(rawBuffer)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .png({ quality: 90, compressionLevel: 6 })
    .toBuffer();

  // Guardar en: bundles/{uuid}.png
  const fileName = `bundles/${crypto.randomUUID()}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, pngBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) {
    throw new Error(`Error al subir: ${error.message}`);
  }

  return fileName;
}

/**
 * Genera URL firmada (usa la misma función que productos)
 */
export async function createSignedBundleImageUrl(filePath: string | null): Promise<string | null> {
  if (!filePath || filePath.startsWith("http")) {
    return filePath;
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600 * 24 * 30);

    if (error) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
