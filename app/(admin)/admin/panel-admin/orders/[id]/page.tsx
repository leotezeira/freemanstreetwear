import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrderShippingActions } from "@/components/admin/order-shipping-actions";

export const dynamic = "force-dynamic";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_email, customer_phone, shipping_address, postal_code, total_amount, shipping_amount, shipping_type, shipping_price, shipping_agency_code, shipping_id, tracking_number, shipping_status, tracking_events, payment_status, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, price_at_purchase, products(name)")
    .eq("order_id", id);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Orden {order.id}</h1>

      <article className="card-base space-y-1">
        <p className="font-semibold">{order.customer_name}</p>
        <p className="text-sm text-slate-600">{order.customer_email}</p>
        <p className="text-sm text-slate-600">{order.customer_phone}</p>
        <p className="text-sm text-slate-600">{order.shipping_address}</p>
        <p className="text-sm text-slate-600">CP: {order.postal_code}</p>
        <p className="text-sm font-semibold uppercase">Estado: {order.payment_status}</p>
      </article>

      <article className="card-base space-y-3">
        <h2 className="text-lg font-bold">Envío</h2>
        <div className="grid gap-1 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Tipo:</span> {order.shipping_type ?? "—"}
          </p>
          <p>
            <span className="font-semibold">Precio:</span> ${Number(order.shipping_price ?? order.shipping_amount ?? 0).toLocaleString("es-AR")}
          </p>
          <p>
            <span className="font-semibold">Sucursal:</span> {order.shipping_agency_code ?? "—"}
          </p>
        </div>

        <OrderShippingActions
          orderId={order.id}
          shippingId={order.shipping_id ?? null}
          trackingNumber={order.tracking_number ?? null}
          shippingStatus={order.shipping_status ?? null}
          trackingEvents={(order as any).tracking_events ?? null}
          canRetryImport={order.payment_status === "approved" && !order.shipping_id}
        />
      </article>

      <article className="card-base space-y-3">
        <h2 className="text-lg font-bold">Items</h2>
        {items?.map((item) => {
          const productRef = item.products as { name?: string } | null;
          return (
            <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
              <span>{productRef?.name ?? "Producto"}</span>
              <span>
                {item.quantity} x ${Number(item.price_at_purchase).toLocaleString("es-AR")}
              </span>
            </div>
          );
        })}
        <p className="pt-2 text-base font-bold">Total: ${Number(order.total_amount).toLocaleString("es-AR")}</p>
      </article>
    </section>
  );
}