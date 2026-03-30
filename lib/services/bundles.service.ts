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
          stock
        ),
        product_variants (
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
          stock
        ),
        product_variants (
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
          stock
        ),
        product_variants (
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
          stock
        ),
        product_variants (
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
  
  return data;
}

export async function createBundle(formData: BundleFormData): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();
  
  // Validar que haya al menos un producto
  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto");
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
    })
    .select()
    .single();

  if (bundleError) throw new Error(bundleError.message);

  // Crear bundle_items
  const itemsPayload = formData.items.map((item) => ({
    bundle_id: bundle.id,
    product_id: item.product_id,
    variant_id: item.variant_id ?? null,
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
    variant_id: item.variant_id ?? null,
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
