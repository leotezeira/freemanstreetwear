import type { Product } from "@/types/domain";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSignedProductImageUrl } from "@/lib/services/product-images.service";

type CarouselRow = {
  id: string;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  products?: Product & {
    product_images?: Array<{ image_path: string | null; is_primary: boolean; sort_order: number }>;
    primary_image_url?: string | null;
    hover_image_url?: string | null;
  };
};

const SELECT_WITH_PRODUCT = `
  id,
  product_id,
  sort_order,
  is_active,
  created_at,
  products!product_id (
    id,
    name,
    description,
    price,
    compare_at_price,
    stock,
    is_active,
    created_at,
    slug,
    category,
    tags,
    product_images (image_path, is_primary, sort_order)
  )
`;

function isMissingTable(error: unknown) {
  const message = (error as any)?.message;
  if (!message || typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return lower.includes("product_carousel_items") && (lower.includes("does not exist") || lower.includes("relation"));
}

async function signProductImages(product: any): Promise<Product & { primary_image_url?: string | null; hover_image_url?: string | null }> {
  const images = product?.product_images ?? [];
  const ordered = images
    .filter((img: any) => img?.image_path)
    .sort((a: any, b: any) => (Number(a?.sort_order ?? 0) || 0) - (Number(b?.sort_order ?? 0) || 0));

  const primary = ordered.find((img: any) => img.is_primary) ?? ordered[0] ?? null;
  const secondary = ordered.find((img: any) => img !== primary) ?? null;

  const primaryUrl = primary?.image_path ? await createSignedProductImageUrl(primary.image_path).catch(() => null) : null;
  const hoverUrl = secondary?.image_path ? await createSignedProductImageUrl(secondary.image_path).catch(() => null) : null;

  return {
    ...(product as Product),
    primary_image_url: primaryUrl,
    hover_image_url: hoverUrl,
  };
}

export async function getActiveCarouselProducts(): Promise<Product[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("product_carousel_items")
      .select(SELECT_WITH_PRODUCT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }

    const rows = (data ?? []) as CarouselRow[];
    const signedProducts = await Promise.all(
      rows
        .map((row) => row.products)
        .filter((p): p is NonNullable<CarouselRow["products"]> => !!p && p.is_active)
        .map((p) => signProductImages(p))
    );

    const map = new Map<string, Product>();
    signedProducts.forEach((p) => map.set(p.id, p));

    return rows
      .map((row) => map.get(row.product_id))
      .filter((p): p is Product => Boolean(p));
  } catch (e) {
    console.error("[getActiveCarouselProducts]", e);
    return [];
  }
}

export async function getCarouselItemsForAdmin(): Promise<CarouselRow[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("product_carousel_items")
      .select(SELECT_WITH_PRODUCT)
      .order("sort_order", { ascending: true });

    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }

    const rows = (data ?? []) as CarouselRow[];
    const signedProducts = await Promise.all(
      rows
        .map((row) => row.products)
        .filter((p): p is NonNullable<CarouselRow["products"]> => !!p)
        .map((p) => signProductImages(p))
    );

    const map = new Map<string, Product & { primary_image_url?: string | null; hover_image_url?: string | null }>();
    signedProducts.forEach((p) => map.set(p.id, p));

    return rows.map((row) => ({
      ...row,
      products: map.get(row.product_id) ?? row.products,
    }));
  } catch (e) {
    console.error("[getCarouselItemsForAdmin]", e);
    return [];
  }
}
