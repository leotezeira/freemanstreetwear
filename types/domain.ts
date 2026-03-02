export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  is_active: boolean;
  is_featured?: boolean;
  image_url?: string | null;
  category?: string | null;
  tags?: string[];
  weight_grams?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
  slug?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  sku: string | null;
  stock: number;
  price: number | null;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_path: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  order_number?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  postal_code: string;
  total_amount: number;
  shipping_amount: number;
  shipping_type?: "D" | "S" | null;
  shipping_price?: number;
  shipping_agency_code?: string | null;
  shipping_id?: string | null;
  tracking_number?: string | null;
  shipping_status?: string | null;
  tracking_events?: unknown[] | null;
  last_tracking_sync_at?: string | null;
  payment_status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
};
