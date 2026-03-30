export type Bundle = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  image_path: string | null;
  required_quantity: number; // Cantidad de productos que el cliente debe elegir
  created_at: string;
};

export type BundleItem = {
  id: string;
  bundle_id: string;
  product_id: string;
  variant_id: string | null; // Si es null, el cliente elige la variante
  created_at: string;
};

export type BundleWithItems = Bundle & {
  bundle_items: (BundleItem & {
    products: {
      name: string;
      category: string | null;
      price: number;
      is_active: boolean;
      stock: number;
      image_path: string | null;
    } | null;
    product_variants: {
      id: string;
      size: string;
      color: string;
      sku: string | null;
      stock: number;
      price: number | null;
    } | null;
    _all_variants?: {
      id: string;
      size: string;
      color: string;
      sku: string | null;
      stock: number;
      price: number | null;
    }[];
  })[];
};

export type BundleFormData = {
  name: string;
  description?: string;
  slug?: string;
  price: number;
  compare_at_price?: number;
  is_active: boolean;
  image_path?: string | null;
  required_quantity: number; // Cantidad de productos a elegir
  items: Array<{
    product_id: string;
    variant_id?: string | null; // null = cliente elige variante
  }>;
};
