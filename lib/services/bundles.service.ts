import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Bundle, BundleWithItems, BundleFormData } from "@/types/bundle";

/**
 * Genera URL firmada para imagen de producto
 */
async function createSignedProductImageUrl(filePath: string | null): Promise<string | null> {
  if (!filePath) return null;
  
  const supabase = getSupabaseAdminClient();
  
  try {
    const { data, error } = await supabase.storage
      .from("product-images")
      .createSignedUrl(filePath, 3600 * 24 * 30);
    
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

/**
 * Obtiene imagen principal de bundle con URL firmada
 */
async function getBundleImageUrl(bundleId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error: fetchError } = await supabase
    .from("bundle_images")
    .select("image_path")
    .eq("bundle_id", bundleId)
    .eq("is_primary", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("[getBundleImageUrl] Fetch error:", fetchError);
    return null;
  }

  if (!data?.image_path) {
    console.warn("[getBundleImageUrl] No image path found for bundle:", bundleId);
    return null;
  }

  console.log("[getBundleImageUrl] Image path found:", data.image_path);

  const { data: urlData, error } = await supabase.storage
    .from("bundle-images")
    .createSignedUrl(data.image_path, 3600 * 24 * 30);

  if (error) {
    console.error("[getBundleImageUrl] Signed URL error:", error);
    return null;
  }

  console.log("[getBundleImageUrl] Signed URL generated:", urlData.signedUrl);
  return urlData.signedUrl;
}

/**
 * Procesa las imágenes de los productos para convertir filePaths a URLs firmadas
 */
async function processProductImages(products: any[]) {
  return await Promise.all(products.map(async (product: any) => {
    const primaryImage = product.product_images?.find((img: any) => img.is_primary) ?? product.product_images?.[0];
    const imageUrl = await createSignedProductImageUrl(primaryImage?.image_path ?? null);
    
    return {
      ...product,
      image_path: imageUrl,
      product_variants: product.product_variants ?? [],
    };
  }));
}

export async function getBundles(): Promise<BundleWithItems[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(`
      *,
      bundle_items (
        *,
        products (
          id,
          name,
          description,
          category,
          price,
          compare_at_price,
          is_active,
          stock,
          product_images (
            image_path,
            is_primary
          ),
          product_variants (
            id,
            size,
            color,
            sku,
            stock,
            price
          )
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const normalized = await Promise.all((data ?? []).map(async (bundle: any) => {
    const imageUrl = await getBundleImageUrl(bundle.id);
    
    const processedItems = await Promise.all((bundle.bundle_items ?? []).map(async (item: any) => ({
      ...item,
      products: item.products ? await processProductImages([item.products]).then(r => r[0]) : null,
    })));

    return {
      ...bundle,
      image_path: imageUrl,
      bundle_items: processedItems,
    };
  }));

  return normalized;
}

export async function getActiveBundles(): Promise<BundleWithItems[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(`
      *,
      bundle_items (
        *,
        products (
          id,
          name,
          description,
          category,
          price,
          compare_at_price,
          is_active,
          stock,
          product_images (
            image_path,
            is_primary
          ),
          product_variants (
            id,
            size,
            color,
            sku,
            stock,
            price
          )
        )
      )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const normalized = await Promise.all((data ?? []).map(async (bundle: any) => {
    const imageUrl = await getBundleImageUrl(bundle.id);
    
    const processedItems = await Promise.all((bundle.bundle_items ?? []).map(async (item: any) => ({
      ...item,
      products: item.products ? await processProductImages([item.products]).then(r => r[0]) : null,
    })));

    return {
      ...bundle,
      image_path: imageUrl,
      bundle_items: processedItems,
    };
  }));

  return normalized;
}

export async function getBundleById(id: string): Promise<BundleWithItems | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(`
      *,
      bundle_items (
        *,
        products (
          id,
          name,
          description,
          category,
          price,
          compare_at_price,
          is_active,
          stock,
          product_images (
            image_path,
            is_primary
          ),
          product_variants (
            id,
            size,
            color,
            sku,
            stock,
            price
          )
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) return null;

  const bundle: any = data;
  if (bundle) {
    bundle.image_path = await getBundleImageUrl(bundle.id);
    
    bundle.bundle_items = await Promise.all((bundle.bundle_items ?? []).map(async (item: any) => ({
      ...item,
      products: item.products ? await processProductImages([item.products]).then(r => r[0]) : null,
    })));
  }

  return bundle;
}

export async function getBundleBySlug(slug: string): Promise<BundleWithItems | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(`
      *,
      bundle_items (
        *,
        products (
          id,
          name,
          description,
          category,
          price,
          compare_at_price,
          is_active,
          stock,
          product_images (
            image_path,
            is_primary
          ),
          product_variants (
            id,
            size,
            color,
            sku,
            stock,
            price
          )
        )
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;

  const bundle: any = data;
  if (bundle) {
    bundle.image_path = await getBundleImageUrl(bundle.id);
    
    bundle.bundle_items = await Promise.all((bundle.bundle_items ?? []).map(async (item: any) => ({
      ...item,
      products: item.products ? await processProductImages([item.products]).then(r => r[0]) : null,
    })));
  }

  return bundle;
}

export async function createBundle(formData: BundleFormData): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto");
  }

  if (formData.min_items < 1) {
    throw new Error("min_items debe ser al menos 1");
  }
  if (formData.max_items < formData.min_items) {
    throw new Error("max_items debe ser mayor o igual a min_items");
  }

  let compareAtPrice = formData.compare_at_price;
  if (compareAtPrice === undefined || compareAtPrice === null) {
    const productIds = formData.items.map((item) => item.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, price")
      .in("id", productIds);

    if (products) {
      compareAtPrice = formData.items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.product_id);
        return sum + (product?.price ?? 0) * item.quantity;
      }, 0);
    }
  }

  let slug = formData.slug;
  if (!slug) {
    slug = formData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const { data: bundle, error: bundleError } = await supabase
    .from("bundles")
    .insert({
      name: formData.name,
      description: formData.description ?? null,
      slug,
      price: formData.price,
      compare_at_price: compareAtPrice ?? null,
      is_active: formData.is_active,
      min_items: formData.min_items,
      max_items: formData.max_items,
    })
    .select()
    .single();

  if (bundleError) throw new Error(bundleError.message);

  const itemsPayload = formData.items.map((item) => ({
    bundle_id: bundle.id,
    product_id: item.product_id,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("bundle_items")
    .insert(itemsPayload);

  if (itemsError) throw new Error(itemsError.message);

  return bundle;
}

export async function updateBundle(
  id: string,
  formData: BundleFormData
): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto");
  }

  if (formData.min_items < 1) {
    throw new Error("min_items debe ser al menos 1");
  }
  if (formData.max_items < formData.min_items) {
    throw new Error("max_items debe ser mayor o igual a min_items");
  }

  let compareAtPrice = formData.compare_at_price;
  if (compareAtPrice === undefined || compareAtPrice === null) {
    const productIds = formData.items.map((item) => item.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, price")
      .in("id", productIds);

    if (products) {
      compareAtPrice = formData.items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.product_id);
        return sum + (product?.price ?? 0) * item.quantity;
      }, 0);
    }
  }

  let slug = formData.slug;
  if (!slug) {
    slug = formData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const { data: bundle, error: bundleError } = await supabase
    .from("bundles")
    .update({
      name: formData.name,
      description: formData.description ?? null,
      slug,
      price: formData.price,
      compare_at_price: compareAtPrice ?? null,
      is_active: formData.is_active,
      min_items: formData.min_items,
      max_items: formData.max_items,
    })
    .eq("id", id)
    .select()
    .single();

  if (bundleError) throw new Error(bundleError.message);

  await supabase.from("bundle_items").delete().eq("bundle_id", id);

  const itemsPayload = formData.items.map((item) => ({
    bundle_id: id,
    product_id: item.product_id,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("bundle_items")
    .insert(itemsPayload);

  if (itemsError) throw new Error(itemsError.message);

  return bundle;
}

export async function deleteBundle(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("bundles")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function toggleBundleActive(id: string): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  const { data: current } = await supabase
    .from("bundles")
    .select("is_active")
    .eq("id", id)
    .single();

  if (!current) throw new Error("Bundle no encontrado");

  const { data: updated, error } = await supabase
    .from("bundles")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
}
