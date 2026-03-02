import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type CreateOrderInput = {
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  postalCode: string;
  totalAmount: number;
  shippingAmount: number;
  shippingType: "D" | "S";
  shippingPrice: number;
  shippingAgencyCode?: string | null;
  paymentStatus: "pending" | "approved" | "rejected";
  items: Array<{
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
};

export async function createOrderWithItems(input: CreateOrderInput) {
  const supabase = getSupabaseAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: input.orderNumber ?? null,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      shipping_address: input.shippingAddress,
      postal_code: input.postalCode,
      total_amount: input.totalAmount,
      shipping_amount: input.shippingAmount,
      shipping_type: input.shippingType,
      shipping_price: input.shippingPrice,
      shipping_agency_code: input.shippingAgencyCode ?? null,
      payment_status: input.paymentStatus,
    })
    .select("id")
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  const orderItemsPayload = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    price_at_purchase: item.priceAtPurchase,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);

  if (itemsError) {
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  return order;
}
