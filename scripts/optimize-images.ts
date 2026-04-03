import { getSupabaseAdminClient } from "../lib/supabase/admin";
import sharp from "sharp";

const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const BUNDLE_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const MAX_IMAGE_WIDTH = Number(process.env.MAX_PRODUCT_IMAGE_WIDTH ?? "1600");
const WEBP_QUALITY = Number(process.env.PRODUCT_IMAGE_WEBP_QUALITY ?? "82");

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function isAlreadyOptimized(buffer: Buffer): Promise<boolean> {
  const metadata = await sharp(buffer).metadata();
  return metadata.format === "webp" && !!metadata.width && metadata.width <= MAX_IMAGE_WIDTH;
}

async function optimizeImagesInBucket(supabase: any, bucket: string, images: { id: string; image_path: string }[]) {
  for (const img of images) {
    try {
      console.log(`Optimizando ${img.image_path}...`);

      // Descargar imagen
      const { data, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(img.image_path);

      if (downloadError) {
        console.error(`Error descargando ${img.image_path}:`, downloadError);
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      // Verificar si ya es WebP y optimizada
      if (await isAlreadyOptimized(buffer)) {
        console.log(`Saltando ${img.image_path} (ya optimizada)`);
        continue;
      }

      // Optimizar
      const optimizedBuffer = await optimizeImage(buffer);

      // Subir de vuelta (reemplazar)
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .update(img.image_path, optimizedBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Error subiendo ${img.image_path}:`, uploadError);
      } else {
        console.log(`Optimizada ${img.image_path}`);
      }
    } catch (error) {
      console.error(`Error procesando ${img.image_path}:`, error);
    }
  }
}

async function optimizeExistingImages() {
  const supabase = getSupabaseAdminClient();

  console.log("Optimizando imágenes de productos...");

  // Obtener todas las imágenes de productos
  const { data: productImages, error: productError } = await supabase
    .from("product_images")
    .select("id, image_path");

  if (productError) {
    console.error("Error obteniendo imágenes de productos:", productError);
    return;
  }

  await optimizeImagesInBucket(supabase, PRODUCT_IMAGES_BUCKET, productImages ?? []);

  console.log("Optimizando imágenes de bundles...");

  // Obtener todas las imágenes de bundles
  const { data: bundleImages, error: bundleError } = await supabase
    .from("bundle_images")
    .select("id, image_path");

  if (bundleError) {
    console.error("Error obteniendo imágenes de bundles:", bundleError);
    return;
  }

  await optimizeImagesInBucket(supabase, BUNDLE_IMAGES_BUCKET, bundleImages ?? []);

  console.log("Optimización completada.");
}

optimizeExistingImages().catch(console.error);