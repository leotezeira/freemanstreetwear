// =====================================================
// TIPOS PARA EL SISTEMA DE BUNDLES
// =====================================================

/**
 * Bundle principal
 */
export type Bundle = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  image_path: string | null;
  required_quantity: number;
  created_at: string;
  updated_at: string;
};

/**
 * Imagen de bundle
 */
export type BundleImage = {
  id: string;
  bundle_id: string;
  image_path: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

/**
 * Producto dentro de un bundle
 */
export type BundleItem = {
  id: string;
  bundle_id: string;
  product_id: string;
  variant_id: string | null;
  created_at: string;
};

/**
 * Producto con sus imágenes (para usar en bundle_items)
 */
export type BundleProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  stock: number;
  product_images: Array<{
    image_path: string | null;
    is_primary: boolean;
  }> | [];
  product_variants: Array<{
    id: string;
    size: string;
    color: string;
    sku: string | null;
    stock: number;
    price: number | null;
  }> | [];
  // URL firmada de la imagen principal (para uso en frontend)
  primary_image_url?: string | null;
  // Mantenido para compatibilidad
  image_path?: string | null;
};

/**
 * Variante de producto
 */
export type ProductVariant = {
  id: string;
  size: string;
  color: string;
  sku: string | null;
  stock: number;
  price: number | null;
};

/**
 * Bundle con todos sus items y productos relacionados
 */
export type BundleWithItems = Bundle & {
  bundle_items: (BundleItem & {
    products: BundleProduct | null;
    product_variants: ProductVariant | null;
    _all_variants?: ProductVariant[];
  })[];
  bundle_images?: BundleImage[];
};

/**
 * Datos para crear/actualizar un bundle
 */
export type BundleFormData = {
  name: string;
  description?: string;
  slug?: string;
  price: number;
  compare_at_price?: number;
  is_active: boolean;
  image_path?: string | null;
  required_quantity: number;
  items: Array<{
    product_id: string;
    variant_id?: string | null;
  }>;
};

/**
 * Item seleccionado en el carrito (para bundles)
 */
export type BundleCartItem = {
  productId: string;
  variantId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
  bundleId: string;
  bundleGroupId: string;
};
