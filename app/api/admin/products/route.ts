import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slug";
import { sanitizeProductHtml } from "@/lib/utils/sanitize";

const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";

/**
 * Genera URL firmada para una imagen de producto
 */
async function createSignedProductImageUrl(filePath: string | null): Promise<string | null> {
  if (!filePath) return null;
  
  const supabase = getSupabaseAdminClient();
  
  try {
    const { data, error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .createSignedUrl(filePath, 3600 * 24 * 30); // 30 días
    
    if (error) {
      console.error("[createSignedProductImageUrl] Error:", error);
      return null;
    }
    
    return data.signedUrl;
  } catch (e) {
    console.error("[createSignedProductImageUrl] Exception:", e);
    return null;
  }
}
const MAX_PRODUCT_IMAGE_BYTES = Number(process.env.MAX_PRODUCT_IMAGE_BYTES ?? String(4 * 1024 * 1024));
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_WIDTH = Number(process.env.MAX_PRODUCT_IMAGE_WIDTH ?? "1600");
const WEBP_QUALITY = Number(process.env.PRODUCT_IMAGE_WEBP_QUALITY ?? "82");
const MAX_IMAGES_PER_PRODUCT = 6;

function isSupabaseConnectivityErrorMessage(message: string) {
  const msg = message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("enotfound") ||
    msg.includes("eai_again") ||
    msg.includes("could not resolve host") ||
    msg.includes("network")
  );
}

function parseTags(input: string) {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function toOptionalNumber(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type VariantInput = {
  size: string;
  color: string;
  sku: string | null;
  stock: number;
  price: number | null;
};

function parseVariantsJson(input: FormDataEntryValue | null): VariantInput[] {
  if (input === null) return [];
  const raw = String(input).trim();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Variantes inválidas (JSON)");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Variantes inválidas");
  }

  const out: VariantInput[] = [];
  for (const v of parsed) {
    if (!v || typeof v !== "object") continue;
    const obj = v as any;
    const size = String(obj.size ?? "").trim();
    const color = String(obj.color ?? "").trim();
    const sku = obj.sku === null || obj.sku === undefined || String(obj.sku).trim() === "" ? null : String(obj.sku).trim();
    const stock = Number(obj.stock ?? 0);
    const price = obj.price === null || obj.price === undefined || obj.price === "" ? null : Number(obj.price);

    if (!size || !color) {
      throw new Error("Cada variante debe tener talle y color");
    }
    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error("Stock de variante inválido");
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      throw new Error("Precio de variante inválido");
    }

    out.push({ size, color, sku, stock, price });
  }

  return out;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const byCategory = searchParams.get("byCategory") === "true";

    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        description,
        price,
        compare_at_price,
        stock,
        category,
        tags,
        is_active,
        is_featured,
        slug,
        created_at,
        product_images!left (
          image_path,
          is_primary
        ),
        product_variants!left (
          id,
          size,
          color,
          stock,
          price,
          sku
        )
      `
      );

    if (q.trim()) {
      query = query.ilike("name", `%${q.trim()}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Generar URLs firmadas para las imágenes
    const products = await Promise.all((data ?? []).map(async (product: any) => {
      const primaryImage = product.product_images?.find((img: any) => img.is_primary) ?? product.product_images?.[0];
      const imageUrl = primaryImage?.image_path ? await createSignedProductImageUrl(primaryImage.image_path) : null;
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        compare_at_price: product.compare_at_price,
        stock: product.stock,
        category: product.category,
        tags: product.tags,
        is_active: product.is_active,
        is_featured: product.is_featured,
        slug: product.slug,
        created_at: product.created_at,
        image_path: imageUrl,
        variants: (product.product_variants ?? []).map((v: any) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: v.stock,
          price: v.price,
        })),
      };
    }));

    if (byCategory) {
      const grouped = products.reduce((acc, product) => {
        const category = product.category ?? "Sin categoría";
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
      }, {} as Record<string, typeof products>);

      return NextResponse.json({ grouped, products: [] });
    }

    return NextResponse.json({ products, grouped: {} });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al buscar productos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const name = String(form.get("name") ?? "").trim();
    const descriptionRaw = String(form.get("description") ?? "");
    const description = sanitizeProductHtml(descriptionRaw);
    const slugInput = String(form.get("slug") ?? "").trim() || name;
    const baseSlug = slugify(slugInput);
    const slug = baseSlug ? `${baseSlug}-${crypto.randomUUID().slice(0, 8)}` : crypto.randomUUID();

    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const uploadFiles = form.getAll("files").filter((value): value is File => value instanceof File);
    if (uploadFiles.length > MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json(
        { error: `Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto` },
        { status: 409 }
      );
    }

    for (const file of uploadFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json({ error: `Tipo inválido: ${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Archivo demasiado grande. Máximo ${MAX_PRODUCT_IMAGE_BYTES} bytes` },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdminClient();

    const variants = parseVariantsJson(form.get("variantsJson"));
    const primaryIndexRaw = Number(form.get("primaryIndex") ?? 0);
    const primaryIndexUnclamped = Number.isFinite(primaryIndexRaw) && primaryIndexRaw >= 0 ? primaryIndexRaw : 0;

    const stockFromVariants = variants.length ? variants.reduce((sum, v) => sum + (v.stock ?? 0), 0) : null;

    const payload = {
      name,
      description,
      price: Number(form.get("price") ?? 0),
      compare_at_price: toOptionalNumber(form.get("compareAtPrice")) as number | null,
      stock: stockFromVariants ?? Number(form.get("stock") ?? 0),
      category: String(form.get("category") ?? "").trim() || null,
      tags: parseTags(String(form.get("tags") ?? "")),
      weight_grams: toOptionalNumber(form.get("weightGrams")) as number | null,
      height: toOptionalNumber(form.get("height")) as number | null,
      width: toOptionalNumber(form.get("width")) as number | null,
      length: toOptionalNumber(form.get("length")) as number | null,
      slug,
      meta_title: String(form.get("metaTitle") ?? "").trim() || null,
      meta_description: String(form.get("metaDescription") ?? "").trim() || null,
      is_active: String(form.get("isActive") ?? "false") === "true",
      is_featured: String(form.get("isFeatured") ?? "false") === "true",
    };

    let product:
      | {
          id: string;
        }
      | null = null;
    let insertError: { message?: string } | null = null;

    {
      const result = await supabase.from("products").insert(payload).select("id").single();
      product = (result.data as any) ?? null;
      insertError = (result.error as any) ?? null;

      // Backward-compatible retry if DB hasn't been migrated with `is_featured` yet.
      if (insertError?.message && insertError.message.toLowerCase().includes("is_featured")) {
        const { is_featured: _ignored, ...withoutFeatured } = payload as any;
        if (process.env.DEBUG_PRODUCTS_QUERY === "true") {
          console.log("[admin:createProduct] retry without is_featured (missing column)");
        }
        const retry = await supabase.from("products").insert(withoutFeatured).select("id").single();
        product = (retry.data as any) ?? null;
        insertError = (retry.error as any) ?? null;
      }

      // Backward-compatible retry if DB hasn't been migrated with dimensions columns yet.
      if (
        insertError?.message &&
        (insertError.message.toLowerCase().includes("height") ||
          insertError.message.toLowerCase().includes("width") ||
          insertError.message.toLowerCase().includes("length"))
      ) {
        const { height: _h, width: _w, length: _l, ...withoutDims } = payload as any;
        if (process.env.DEBUG_PRODUCTS_QUERY === "true") {
          console.log("[admin:createProduct] retry without dimensions (missing column)");
        }
        const retry = await supabase.from("products").insert(withoutDims).select("id").single();
        product = (retry.data as any) ?? null;
        insertError = (retry.error as any) ?? null;
      }
    }

    if (insertError) {
      const msg = insertError.message || "Failed to insert product";
      if (isSupabaseConnectivityErrorMessage(msg)) {
        return NextResponse.json(
          {
            error:
              "No se pudo conectar con Supabase para guardar el producto. Verificá NEXT_PUBLIC_SUPABASE_URL y que el proyecto de Supabase esté activo.",
            details: msg,
          },
          { status: 503 }
        );
      }

      const isSchemaCache = msg.toLowerCase().includes("schema cache") || msg.toLowerCase().includes("could not find");
      if (isSchemaCache) {
        return NextResponse.json(
          {
            error:
              "Tu tabla `products` no tiene columnas nuevas (ej: `weight_grams`, `height`, `width`, `length`, `category`, `tags`, `slug`, `is_featured`, etc.). Ejecutá la migración SQL en Supabase y luego reintentá.",
            details: msg,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const productId = (product as any).id as string;

    if (process.env.DEBUG_PRODUCTS_QUERY === "true") {
      console.log("[admin:createProduct]", { productId, is_active: payload.is_active, is_featured: payload.is_featured, name });
    }

    if (variants.length) {
      const insertVariants = variants.map((v) => ({
        product_id: productId,
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: v.stock,
        price: v.price,
      }));

      const { error: variantsError } = await supabase.from("product_variants").insert(insertVariants);
      if (variantsError) {
        return NextResponse.json({ error: variantsError.message, productId }, { status: 500 });
      }
    }

    if (uploadFiles.length) {
      const uploadedPaths: string[] = [];

      for (const file of uploadFiles) {
        const filename = `${crypto.randomUUID()}.webp`;
        const path = `products/${productId}/${filename}`;

        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const webpBuffer = await sharp(rawBuffer)
          .rotate()
          .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(path, webpBuffer, { contentType: "image/webp", upsert: false });

        if (uploadError) {
          return NextResponse.json({ error: uploadError.message, productId }, { status: 500 });
        }

        uploadedPaths.push(path);
      }

      const primaryIndex = Math.min(primaryIndexUnclamped, Math.max(0, uploadedPaths.length - 1));

      const insertPayload = uploadedPaths.map((image_path, index) => ({
        product_id: productId,
        image_path,
        sort_order: index,
        is_primary: index === primaryIndex,
      }));

      const { error: imgError } = await supabase.from("product_images").insert(insertPayload);
      if (imgError) {
        return NextResponse.json({ error: imgError.message, productId }, { status: 500 });
      }
    }

    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/admin/panel-admin/products");

    return NextResponse.json({ ok: true, productId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    if (isSupabaseConnectivityErrorMessage(message)) {
      return NextResponse.json(
        {
          error:
            "No se pudo conectar con Supabase para guardar el producto. Verificá NEXT_PUBLIC_SUPABASE_URL y que el proyecto de Supabase esté activo.",
          details: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
