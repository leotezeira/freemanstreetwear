export type Bundle = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  image_path: string | null;
  min_items: number; // Cantidad mínima de productos que debe elegir el cliente
  max_items: number; // Cantidad máxima de productos que puede elegir el cliente
  created_at: string;
};

export type BundleItem = {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number; // Cantidad de este producto que viene en el bundle
  created_at: string;
};

export type BundleWithItems = Bundle & {
  bundle_items: (BundleItem & {
    products: {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      price: number;
      compare_at_price: number | null;
      is_active: boolean;
      stock: number;
      image_path: string | null;
      product_images?: Array<{
        image_path: string | null;
        is_primary: boolean;
      }>;
      product_variants?: Array<{
        id: string;
        size: string;
        color: string;
        sku: string | null;
        stock: number;
        price: number | null;
      }>;
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
  min_items: number;
  max_items: number;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
};
