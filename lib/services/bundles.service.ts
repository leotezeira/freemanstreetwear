import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Bundle, BundleWithItems, BundleFormData } from "@/types/bundle";

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

  const normalized = (data ?? []).map((bundle: any) => ({
    ...bundle,
    bundle_items: (bundle.bundle_items ?? []).map((item: any) => ({
      ...item,
      products: item.products ? {
        ...item.products,
        image_path: item.products.product_images?.find((img: any) => img.is_primary)?.image_path ??
                    item.products.product_images?.[0]?.image_path ?? null,
        product_variants: item.products.product_variants ?? [],
      } : null,
    })),
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

  const normalized = (data ?? []).map((bundle: any) => ({
    ...bundle,
    bundle_items: (bundle.bundle_items ?? []).map((item: any) => ({
      ...item,
      products: item.products ? {
        ...item.products,
        image_path: item.products.product_images?.find((img: any) => img.is_primary)?.image_path ??
                    item.products.product_images?.[0]?.image_path ?? null,
        product_variants: item.products.product_variants ?? [],
      } : null,
    })),
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
    bundle.bundle_items = (bundle.bundle_items ?? []).map((item: any) => ({
      ...item,
      products: item.products ? {
        ...item.products,
        image_path: item.products.product_images?.find((img: any) => img.is_primary)?.image_path ??
                    item.products.product_images?.[0]?.image_path ?? null,
        product_variants: item.products.product_variants ?? [],
      } : null,
    }));
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
    bundle.bundle_items = (bundle.bundle_items ?? []).map((item: any) => ({
      ...item,
      products: item.products ? {
        ...item.products,
        image_path: item.products.product_images?.find((img: any) => img.is_primary)?.image_path ??
                    item.products.product_images?.[0]?.image_path ?? null,
        product_variants: item.products.product_variants ?? [],
      } : null,
    }));
  }

  return bundle;
}

export async function createBundle(formData: BundleFormData): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  // Validar que haya al menos un producto
  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto");
  }

  // Validar min_items y max_items
  if (formData.min_items < 1) {
    throw new Error("min_items debe ser al menos 1");
  }
  if (formData.max_items < formData.min_items) {
    throw new Error("max_items debe ser mayor o igual a min_items");
  }

  // Calcular compare_at_price si no se proporcionó
  let compareAtPrice = formData.compare_at_price;
  if (compareAtPrice === undefined || compareAtPrice === null) {
    // Obtener precios de los productos
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

  // Generar slug si no se proporcionó
  let slug = formData.slug;
  if (!slug) {
    slug = formData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Crear bundle
  const { data: bundle, error: bundleError } = await supabase
    .from("bundles")
    .insert({
      name: formData.name,
      description: formData.description ?? null,
      slug,
      price: formData.price,
      compare_at_price: compareAtPrice ?? null,
      is_active: formData.is_active,
      image_path: formData.image_path ?? null,
      min_items: formData.min_items,
      max_items: formData.max_items,
    })
    .select()
    .single();

  if (bundleError) throw new Error(bundleError.message);

  // Crear bundle_items
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

  // Validar que haya al menos un producto
  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto");
  }

  // Validar min_items y max_items
  if (formData.min_items < 1) {
    throw new Error("min_items debe ser al menos 1");
  }
  if (formData.max_items < formData.min_items) {
    throw new Error("max_items debe ser mayor o igual a min_items");
  }

  // Calcular compare_at_price si no se proporcionó
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

  // Generar slug si no se proporcionó
  let slug = formData.slug;
  if (!slug) {
    slug = formData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Actualizar bundle
  const { data: bundle, error: bundleError } = await supabase
    .from("bundles")
    .update({
      name: formData.name,
      description: formData.description ?? null,
      slug,
      price: formData.price,
      compare_at_price: compareAtPrice ?? null,
      is_active: formData.is_active,
      image_path: formData.image_path ?? null,
      min_items: formData.min_items,
      max_items: formData.max_items,
    })
    .eq("id", id)
    .select()
    .single();

  if (bundleError) throw new Error(bundleError.message);

  // Eliminar items existentes
  await supabase.from("bundle_items").delete().eq("bundle_id", id);

  // Crear nuevos items
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

  // Obtener estado actual
  const { data: current } = await supabase
    .from("bundles")
    .select("is_active")
    .eq("id", id)
    .single();

  if (!current) throw new Error("Bundle no encontrado");

  // Actualizar
  const { data: updated, error } = await supabase
    .from("bundles")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
}
