import type { Product, ProductImage, ProductVariant } from "@/types/domain";
import { createSignedProductImageUrl } from "@/lib/services/product-images.service";
import { getSupabasePublicServerClient } from "@/lib/supabase/public";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { unstable_noStore as noStore } from "next/cache";

type SearchProductsInput = {
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  tags?: string[];
  inStockOnly?: boolean;
  sort?: "created_desc" | "price_asc" | "price_desc";
};

type ProductsRow = Product & {
  product_images?: Array<{ image_path: string | null; is_primary: boolean; sort_order: number }>;
};

const SELECT_PRODUCTS_WITH_FEATURED =
  "id, name, description, price, compare_at_price, stock, is_active, is_featured, created_at, slug, category, tags, weight_grams, height, width, length, meta_title, meta_description, product_images(image_path, is_primary, sort_order)";

const SELECT_PRODUCTS_NO_FEATURED =
  "id, name, description, price, compare_at_price, stock, is_active, created_at, slug, category, tags, weight_grams, height, width, length, meta_title, meta_description, product_images(image_path, is_primary, sort_order)";

const SELECT_PRODUCTS_WITH_FEATURED_NO_DIMS =
  "id, name, description, price, compare_at_price, stock, is_active, is_featured, created_at, slug, category, tags, weight_grams, meta_title, meta_description, product_images(image_path, is_primary, sort_order)";

const SELECT_PRODUCTS_NO_FEATURED_NO_DIMS =
  "id, name, description, price, compare_at_price, stock, is_active, created_at, slug, category, tags, weight_grams, meta_title, meta_description, product_images(image_path, is_primary, sort_order)";

function isMissingFeaturedColumn(error: unknown) {
  const msg = (error as any)?.message;
  if (!msg || typeof msg !== "string") return false;
  const lower = msg.toLowerCase();
  return lower.includes("is_featured") && (lower.includes("could not find") || lower.includes("schema cache") || lower.includes("column"));
}

function isMissingDimensionsColumn(error: unknown) {
  const msg = (error as any)?.message;
  if (!msg || typeof msg !== "string") return false;
  const lower = msg.toLowerCase();
  const looksLikeMissing = lower.includes("could not find") || lower.includes("schema cache") || lower.includes("column");
  if (!looksLikeMissing) return false;
  return lower.includes("height") || lower.includes("width") || lower.includes("length");
}

function shouldRetryWithoutDims(error: unknown) {
  return isMissingDimensionsColumn(error);
}

function isSupabaseConnectivityError(error: unknown) {
  const msg = (error as any)?.message;
  if (!msg || typeof msg !== "string") return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("enotfound") ||
    lower.includes("eai_again") ||
    lower.includes("could not resolve host") ||
    lower.includes("network")
  );
}

async function attachSignedImages(rows: ProductsRow[]) {
  return Promise.all(
    rows.map(async (row) => {
      const images = row.product_images ?? [];
      const best =
        images.find((img) => img.is_primary && img.image_path) ??
        images
          .filter((img) => !!img.image_path)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

      const ordered = images
        .filter((img) => !!img.image_path)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const secondary = ordered.find((img) => img.image_path && img.image_path !== best?.image_path) ?? null;

      const primary_image_url = best?.image_path
        ? await createSignedProductImageUrl(best.image_path).catch(() => null)
        : null;

      const hover_image_url = secondary?.image_path
        ? await createSignedProductImageUrl(secondary.image_path).catch(() => null)
        : null;

      return {
        ...row,
        primary_image_url,
        hover_image_url,
      };
    })
  );
}

export async function searchProductsByName(input?: SearchProductsInput): Promise<Product[]> {
  noStore();
  const supabase = getSupabasePublicServerClient();

  const buildQuery = (select: string) => {
    let query = supabase
      .from("products")
      .select(select)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (input?.searchTerm && input.searchTerm.trim().length > 0) {
      query = query.ilike("name", `%${input.searchTerm.trim()}%`);
    }

    if (typeof input?.minPrice === "number" && Number.isFinite(input.minPrice)) {
      query = query.gte("price", input.minPrice);
    }

    if (typeof input?.maxPrice === "number" && Number.isFinite(input.maxPrice)) {
      query = query.lte("price", input.maxPrice);
    }

    if (input?.category && input.category.trim().length > 0) {
      query = query.eq("category", input.category.trim());
    }

    if (Array.isArray(input?.tags) && input!.tags!.length > 0) {
      for (const tag of input!.tags!) {
        const t = String(tag ?? "").trim();
        if (!t) continue;
        query = query.contains("tags", [t]);
      }
    }

    if (input?.inStockOnly) {
      query = query.gt("stock", 0);
    }

    if (input?.sort === "price_asc") query = query.order("price", { ascending: true });
    else if (input?.sort === "price_desc") query = query.order("price", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    return query;
  };

  let { data, error } = await buildQuery(SELECT_PRODUCTS_WITH_FEATURED);

  if (error && isMissingFeaturedColumn(error)) {
    const retry = await buildQuery(SELECT_PRODUCTS_NO_FEATURED);
    data = retry.data;
    error = retry.error;
  }

  if (error && shouldRetryWithoutDims(error)) {
    // Retry without dimensions (height/width/length) if DB isn't migrated yet.
    const retry = await buildQuery(
      isMissingFeaturedColumn(error) ? SELECT_PRODUCTS_NO_FEATURED_NO_DIMS : SELECT_PRODUCTS_WITH_FEATURED_NO_DIMS
    );
    data = retry.data;
    error = retry.error;

    // If we retried with featured and that column is also missing, retry once more with the minimal select.
    if (error && isMissingFeaturedColumn(error)) {
      const lastRetry = await buildQuery(SELECT_PRODUCTS_NO_FEATURED_NO_DIMS);
      data = lastRetry.data;
      error = lastRetry.error;
    }
  }

  if (error) {
    if (isSupabaseConnectivityError(error)) {
      throw new Error("No se pudo conectar con Supabase. Verificá la URL del proyecto y que esté activo.");
    }
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  if (process.env.DEBUG_PRODUCTS_QUERY === "true") {
    console.log("[store:searchProductsByName]", {
      searchTerm: input?.searchTerm ?? "",
      minPrice: input?.minPrice ?? null,
      maxPrice: input?.maxPrice ?? null,
      count: (data ?? []).length,
    });
  }

  const rows = (data ?? []) as unknown as ProductsRow[];
  const withSigned = await attachSignedImages(rows);

  return withSigned;
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  noStore();
  const supabase = getSupabasePublicServerClient();

  const first = await supabase
    .from("products")
    .select(SELECT_PRODUCTS_WITH_FEATURED)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  let data: any = first.data;
  let error: any = first.error;

  if (error && isMissingFeaturedColumn(error)) {
    // If the DB isn't migrated yet, featured is not available; return empty so Home can fall back to latest.
    data = [];
    error = null;
  }

  if (error && shouldRetryWithoutDims(error)) {
    // If dimensions aren't available yet, retry without them. If featured is present but dims aren't, we can still return featured list.
    const retry = await supabase
      .from("products")
      .select(SELECT_PRODUCTS_WITH_FEATURED_NO_DIMS)
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    data = retry.data;
    error = retry.error;

    if (error && isMissingFeaturedColumn(error)) {
      // Not migrated for featured either; preserve previous behavior (empty list).
      data = [];
      error = null;
    }
  }

  if (error) {
    if (isSupabaseConnectivityError(error)) {
      throw new Error("No se pudo conectar con Supabase. Verificá la URL del proyecto y que esté activo.");
    }
    throw new Error(`Failed to fetch featured products: ${error.message}`);
  }

  if (process.env.DEBUG_PRODUCTS_QUERY === "true") {
    console.log("[store:getFeaturedProducts]", { count: (data ?? []).length, limit });
  }

  const rows = (data ?? []) as unknown as ProductsRow[];
  return attachSignedImages(rows);
}

export async function getProductById(id: string): Promise<Product | null> {
  noStore();
  const supabase = getSupabaseAdminClient();

  const SELECT_WITH_DIMS =
    "id, name, description, price, compare_at_price, stock, is_active, created_at, slug, category, tags, weight_grams, height, width, length, meta_title, meta_description";
  const SELECT_NO_DIMS =
    "id, name, description, price, compare_at_price, stock, is_active, created_at, slug, category, tags, weight_grams, meta_title, meta_description";

  const first = await supabase.from("products").select(SELECT_WITH_DIMS).eq("id", id).maybeSingle();
  if (!first.error) return first.data;

  if (shouldRetryWithoutDims(first.error)) {
    const retry = await supabase.from("products").select(SELECT_NO_DIMS).eq("id", id).maybeSingle();
    if (retry.error) throw new Error(`Failed to fetch product: ${retry.error.message}`);
    return retry.data;
  }

  throw new Error(`Failed to fetch product: ${first.error.message}`);
}

export type ProductDetail = {
  product: Product;
  variants: ProductVariant[];
  images: Array<ProductImage & { signed_url: string | null }>;
};

export async function getProductDetailById(id: string): Promise<ProductDetail | null> {
  noStore();
  const supabase = getSupabasePublicServerClient();

  const SELECT_DETAIL_WITH_FEATURED =
    "id, name, description, price, compare_at_price, stock, is_active, is_featured, created_at, slug, category, tags, weight_grams, height, width, length, meta_title, meta_description";
  const SELECT_DETAIL_NO_FEATURED =
    "id, name, description, price, compare_at_price, stock, is_active, created_at, slug, category, tags, weight_grams, height, width, length, meta_title, meta_description";
  const SELECT_DETAIL_WITH_FEATURED_NO_DIMS =
    "id, name, description, price, compare_at_price, stock, is_active, is_featured, created_at, slug, category, tags, weight_grams, meta_title, meta_description";
  const SELECT_DETAIL_NO_FEATURED_NO_DIMS =
    "id, name, description, price, compare_at_price, stock, is_active, created_at, slug, category, tags, weight_grams, meta_title, meta_description";

  const first = await supabase.from("products").select(SELECT_DETAIL_WITH_FEATURED).eq("id", id).maybeSingle();
  let product = first.data as any;
  let productError = first.error as any;

  if (productError && isMissingFeaturedColumn(productError)) {
    const retry = await supabase.from("products").select(SELECT_DETAIL_NO_FEATURED).eq("id", id).maybeSingle();
    product = retry.data as any;
    productError = retry.error as any;
  }

  if (productError && shouldRetryWithoutDims(productError)) {
    const retry = await supabase
      .from("products")
      .select(isMissingFeaturedColumn(productError) ? SELECT_DETAIL_NO_FEATURED_NO_DIMS : SELECT_DETAIL_WITH_FEATURED_NO_DIMS)
      .eq("id", id)
      .maybeSingle();

    product = retry.data as any;
    productError = retry.error as any;

    if (productError && isMissingFeaturedColumn(productError)) {
      const lastRetry = await supabase.from("products").select(SELECT_DETAIL_NO_FEATURED_NO_DIMS).eq("id", id).maybeSingle();
      product = lastRetry.data as any;
      productError = lastRetry.error as any;
    }
  }

  if (productError) {
    throw new Error(`Failed to fetch product: ${productError.message}`);
  }

  if (!product) {
    return null;
  }

  const [{ data: variants, error: variantsError }, { data: images, error: imagesError }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, product_id, size, color, sku, stock, price, created_at")
      .eq("product_id", product.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("product_images")
      .select("id, product_id, image_path, sort_order, is_primary, created_at")
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (variantsError) {
    throw new Error(`Failed to fetch variants: ${variantsError.message}`);
  }

  if (imagesError) {
    throw new Error(`Failed to fetch images: ${imagesError.message}`);
  }

  const imagesWithSigned = await Promise.all(
    (images ?? []).map(async (image) => {
      if (!image.image_path) {
        return { ...image, signed_url: null };
      }

      const signed_url = await createSignedProductImageUrl(image.image_path).catch(() => null);
      return { ...image, signed_url };
    })
  );

  return {
    product,
    variants: variants ?? [],
    images: imagesWithSigned,
  };
}
