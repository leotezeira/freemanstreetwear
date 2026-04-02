// =====================================================
// SERVICIO DE BUNDLES
// =====================================================

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Bundle, BundleWithItems, BundleFormData } from "@/types/bundle";
import { createSignedBundleImageUrl } from "@/lib/services/bundle-images.service";
import { createSignedProductImageUrl } from "@/lib/services/product-images.service";

// Query base para obtener bundles con sus items y productos
const BUNDLE_SELECT = `
  *,
  bundle_items (
    id,
    bundle_id,
    product_id,
    variant_id,
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
      )
    ),
    product_variants (
      id,
      size,
      color,
      sku,
      stock,
      price
    )
  ),
  bundle_images (
    id,
    image_path,
    sort_order,
    is_primary
  )
`;

/**
 * Obtiene la imagen principal de un producto
 */
function getProductPrimaryImage(product: any): string | null {
  if (!product?.product_images?.length) return null;
  const primary = product.product_images.find((img: any) => img.is_primary);
  return primary?.image_path ?? product.product_images[0]?.image_path ?? null;
}

/**
 * Firma las imágenes de un bundle (bundle + productos)
 */
async function signBundleImages(bundle: any): Promise<any> {
  const signedBundle = { ...bundle };

  // Firmar imagen principal del bundle
  if (bundle.image_path) {
    const signedUrl = await createSignedBundleImageUrl(bundle.image_path);
    signedBundle.image_path = signedUrl ?? bundle.image_path;
    if (!signedUrl) {
      console.warn("[signBundleImages] Failed to sign bundle image, using raw path:", bundle.image_path);
    }
  }

  // Firmar imágenes de bundle_images
  if (bundle.bundle_images?.length) {
    signedBundle.bundle_images = await Promise.all(
      bundle.bundle_images.map(async (img: any) => {
        const signedUrl = await createSignedBundleImageUrl(img.image_path);
        if (!signedUrl) {
          console.warn("[signBundleImages] Failed to sign bundle_image, using raw path:", img.image_path);
        }
        return {
          ...img,
          image_path: signedUrl ?? img.image_path,
        };
      })
    );
  }

  // Firmar imágenes de productos dentro de los items
  if (bundle.bundle_items?.length) {
    signedBundle.bundle_items = await Promise.all(
      bundle.bundle_items.map(async (item: any) => {
        try {
          const product = item.products;
          if (!product) return item;

          // Obtener la ruta de la imagen principal del producto
          const primaryImagePath = getProductPrimaryImage(product);
          let signedImageUrl = null;

          if (primaryImagePath) {
            signedImageUrl = await createSignedProductImageUrl(primaryImagePath).catch((err) => {
              console.warn("[signBundleImages] Failed to sign product image:", primaryImagePath, err.message);
              return null;
            });
          }

          return {
            ...item,
            products: {
              ...product,
              // Guardar la URL firmada en una propiedad separada
              primary_image_url: signedImageUrl,
              image_path: signedImageUrl, // También en image_path para compatibilidad
            },
          };
        } catch (error) {
          console.error("[signBundleImages] Error processing bundle_item:", error);
          return item;
        }
      })
    );
  }

  return signedBundle;
}

/**
 * Obtiene todos los bundles
 */
export async function getBundles(): Promise<BundleWithItems[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return Promise.all((data ?? []).map(signBundleImages));
}

/**
 * Obtiene todos los bundles activos
 */
export async function getActiveBundles(): Promise<BundleWithItems[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return Promise.all((data ?? []).map(signBundleImages));
}

/**
 * Obtiene un bundle por ID
 */
export async function getBundleById(id: string): Promise<BundleWithItems | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return signBundleImages(data);
}

/**
 * Obtiene un bundle por slug (solo activos)
 */
export async function getBundleBySlug(slug: string): Promise<BundleWithItems | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bundles")
    .select(BUNDLE_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  const signed = await signBundleImages(data);

  // Cargar todas las variantes de cada producto
  const bundleItemsWithAllVariants = await Promise.all(
    (signed.bundle_items ?? []).map(async (item: any) => {
      if (!item.product_id) return item;

      const { data: allVariants } = await supabase
        .from("product_variants")
        .select("id, size, color, sku, stock, price")
        .eq("product_id", item.product_id);

      // Firmar imagen del producto si no se firmó antes
      let signedProduct = item.products;
      if (signedProduct && !signedProduct.primary_image_url) {
        const primaryImagePath = getProductPrimaryImage(signedProduct);
        if (primaryImagePath) {
          const signedImageUrl = await createSignedProductImageUrl(primaryImagePath).catch(() => null);
          signedProduct = {
            ...signedProduct,
            primary_image_url: signedImageUrl,
            image_path: signedImageUrl,
          };
        }
      }

      return {
        ...item,
        _all_variants: allVariants ?? [],
        products: signedProduct,
      };
    })
  );

  return {
    ...signed,
    bundle_items: bundleItemsWithAllVariants,
  };
}

/**
 * Crea un nuevo bundle
 */
export async function createBundle(formData: BundleFormData): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto");
  }

  if (!formData.required_quantity || formData.required_quantity < 1) {
    throw new Error("El bundle debe tener una cantidad mínima de productos");
  }

  // Calcular compare_at_price si no se proporciona
  let compareAtPrice = formData.compare_at_price;
  if (compareAtPrice === undefined || compareAtPrice === null) {
    const productIds = formData.items.map((item) => item.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, price")
      .in("id", productIds);

    if (products && products.length > 0) {
      const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
      compareAtPrice = Math.round(avgPrice * formData.required_quantity);
    }
  }

  // Generar slug si no se proporciona
  let slug = formData.slug?.trim();
  if (!slug) {
    slug = formData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Insertar bundle
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

  // Insertar items
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

/**
 * Actualiza un bundle existente
 */
export async function updateBundle(id: string, formData: BundleFormData): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  if (!formData.items || formData.items.length === 0) {
    throw new Error("El bundle debe tener al menos un producto");
  }

  if (!formData.required_quantity || formData.required_quantity < 1) {
    throw new Error("El bundle debe tener una cantidad mínima de productos");
  }

  // Calcular compare_at_price si no se proporciona
  let compareAtPrice = formData.compare_at_price;
  if (compareAtPrice === undefined || compareAtPrice === null) {
    const productIds = formData.items.map((item) => item.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, price")
      .in("id", productIds);

    if (products && products.length > 0) {
      const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
      compareAtPrice = Math.round(avgPrice * formData.required_quantity);
    }
  }

  // Generar slug si no se proporciona
  let slug = formData.slug?.trim();
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

  // Eliminar items existentes y crear nuevos
  await supabase.from("bundle_items").delete().eq("bundle_id", id);

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

/**
 * Elimina un bundle
 */
export async function deleteBundle(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("bundles")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Cambia el estado activo/inactivo de un bundle
 */
export async function toggleBundleActive(id: string): Promise<Bundle> {
  const supabase = getSupabaseAdminClient();

  const { data: current, error: fetchError } = await supabase
    .from("bundles")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError || !current) throw new Error("Bundle no encontrado");

  const { data: updated, error: updateError } = await supabase
    .from("bundles")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);
  
  return updated;
}
