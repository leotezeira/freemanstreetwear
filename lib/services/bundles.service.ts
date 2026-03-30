import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Bundle, BundleWithItems, BundleFormData } from "@/types/bundle";
import { createSignedBundleImageUrl } from "@/lib/services/bundle-images.service";

export async function getBundles(): Promise<BundleWithItems[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(`
      *,
      bundle_items (
        *,
        products (
          name,
          category,
          price,
          is_active,
          stock,
          image_path
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
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Firmar URLs de imágenes
  const bundlesWithSignedImages = await Promise.all(
    (data ?? []).map(async (bundle) => {
      if (bundle.image_path) {
        const signedUrl = await createSignedBundleImageUrl(bundle.image_path).catch(() => null);
        return { ...bundle, image_path: signedUrl ?? bundle.image_path };
      }
      return bundle;
    })
  );

  return bundlesWithSignedImages;
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
          name,
          category,
          price,
          is_active,
          stock,
          image_path
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
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Firmar URLs de imágenes
  const bundlesWithSignedImages = await Promise.all(
    (data ?? []).map(async (bundle) => {
      if (bundle.image_path) {
        const signedUrl = await createSignedBundleImageUrl(bundle.image_path).catch(() => null);
        return { ...bundle, image_path: signedUrl ?? bundle.image_path };
      }
      return bundle;
    })
  );

  return bundlesWithSignedImages;
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
          name,
          category,
          price,
          is_active,
          stock,
          image_path
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
    `)
    .eq("id", id)
    .single();

  if (error) return null;

  // Firmar URL de imagen
  if (data.image_path) {
    const signedUrl = await createSignedBundleImageUrl(data.image_path).catch(() => null);
    data.image_path = signedUrl ?? data.image_path;
  }

  return data;
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
          name,
          category,
          price,
          is_active,
          stock,
          image_path
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
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;

  // Firmar URL de imagen
  if (data.image_path) {
    const signedUrl = await createSignedBundleImageUrl(data.image_path).catch(() => null);
    data.image_path = signedUrl ?? data.image_path;
  }

  // Cargar todas las variantes de cada producto (no solo la asignada al bundle item)
  const bundleItemsWithAllVariants = await Promise.all(
    (data.bundle_items ?? []).map(async (item) => {
      if (item.product_id) {
        const { data: allVariants } = await supabase
          .from("product_variants")
          .select("id, size, color, sku, stock, price")
          .eq("product_id", item.product_id)
          .eq("is_active", true);
        
        // Adjuntar todas las variantes al item
        return {
          ...item,
          _all_variants: allVariants ?? [],
        };
      }
      return item;
    })
  );

  return { ...data, bundle_items: bundleItemsWithAllVariants };
}

export async function createBundle(formData: BundleFormData): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  // Validar que haya al menos un producto en el pool
  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto disponible");
  }

  // Validar required_quantity
  if (!formData.required_quantity || formData.required_quantity < 1) {
    throw new Error("El bundle debe tener una cantidad mínima de productos para elegir");
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
      // Sumar el precio de los productos según required_quantity
      const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
      compareAtPrice = Math.round(avgPrice * formData.required_quantity);
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
      required_quantity: formData.required_quantity,
    })
    .select()
    .single();

  if (bundleError) throw new Error(bundleError.message);

  // Crear bundle_items (pool de productos disponibles)
  const itemsPayload = formData.items.map((item) => ({
    bundle_id: bundle.id,
    product_id: item.product_id,
    variant_id: item.variant_id ?? null,
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

  // Validar que haya al menos un producto en el pool
  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto disponible");
  }

  // Validar required_quantity
  if (!formData.required_quantity || formData.required_quantity < 1) {
    throw new Error("El bundle debe tener una cantidad mínima de productos para elegir");
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
      const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
      compareAtPrice = Math.round(avgPrice * formData.required_quantity);
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
      required_quantity: formData.required_quantity,
    })
    .eq("id", id)
    .select()
    .single();

  if (bundleError) throw new Error(bundleError.message);

  // Eliminar items existentes
  await supabase.from("bundle_items").delete().eq("bundle_id", id);

  // Crear nuevos items (pool de productos disponibles)
  const itemsPayload = formData.items.map((item) => ({
    bundle_id: id,
    product_id: item.product_id,
    variant_id: item.variant_id ?? null,
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
