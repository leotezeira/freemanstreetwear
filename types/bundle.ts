export type Bundle = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  image_path: string | null;
  created_at: string;
};

export type BundleItem = {
  id: string;
  bundle_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
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
    } | null;
    product_variants: {
      size: string;
      color: string;
      sku: string | null;
      stock: number;
      price: number | null;
    } | null;
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
  items: Array<{
    product_id: string;
    variant_id?: string | null;
    quantity: number;
  }>;
};
