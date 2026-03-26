import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import OrderDetailClient from "./order-detail-client";

export const dynamic = "force-dynamic";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_email, customer_phone, shipping_address, postal_code, total_amount, shipping_amount, shipping_type, shipping_price, shipping_agency_code, payment_status, payment_provider, payment_reference, created_at, order_number, shipping_status"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, price_at_purchase, size, color, products(name, category)")
    .eq("order_id", id);

  // Normalize products - Supabase returns array but type expects object
  const normalizedItems = (items ?? []).map((item) => ({
    ...item,
    products: Array.isArray(item.products) ? item.products[0] ?? null : item.products,
  }));

  return <OrderDetailClient order={order} items={normalizedItems} />;
}