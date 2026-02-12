export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category: string | null;
  size: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id?: string;
  email: string;
  full_name: string | null;
  phone: string | null;
}

export interface Order {
  id: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  product_image_url: string | null;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface CheckoutData {
  customer: {
    email: string;
    name: string;
    phone: string;
  };
  shipping: {
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}
