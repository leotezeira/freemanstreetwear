import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

function money(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function StatusPill({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const styles =
    s === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
      : s === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
      : s === "rejected"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
      : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  const label =
    s === "approved" ? "Aprobado" : s === "pending" ? "Pendiente" : s === "rejected" ? "Rechazado" : status || "—";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${styles}`}>
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-800 dark:text-slate-200">{value ?? "—"}</span>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_email, customer_phone, shipping_address, postal_code, total_amount, shipping_amount, shipping_type, shipping_price, shipping_agency_code, shipping_id, tracking_number, shipping_status, tracking_events, payment_status, payment_provider, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, price_at_purchase, products(name, category)")
    .eq("order_id", id);

  const trackingEvents = Array.isArray((order as any).tracking_events)
    ? ((order as any).tracking_events as { status?: string; date?: string; location?: string }[])
    : [];

  const subtotal = (items ?? []).reduce(
    (sum, it) => sum + Number(it.price_at_purchase) * it.quantity,
    0
  );

  return (
    <section className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/panel-admin/orders"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 inline-block"
          >
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-black tracking-tight">
            Pedido {(order as any).order_number ?? String(order.id).slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {order.created_at ? new Date(order.created_at).toLocaleString("es-AR") : "—"}
          </p>
        </div>
        <StatusPill status={order.payment_status ?? ""} />
      </div>

      {/* Cliente */}
      <div className="card-base">
        <h2 className="text-base font-bold mb-3">Cliente</h2>
        <Row label="Nombre" value={order.customer_name} />
        <Row label="Email" value={order.customer_email} />
        <Row label="Teléfono" value={order.customer_phone} />
        <Row label="Dirección" value={order.shipping_address} />
        <Row label="Código postal" value={order.postal_code} />
      </div>

      {/* Pago */}
      <div className="card-base">
        <h2 className="text-base font-bold mb-3">Pago</h2>
        <Row label="Estado" value={<StatusPill status={order.payment_status ?? ""} />} />
        <Row label="Proveedor" value={order.payment_provider} />
        <Row label="Subtotal" value={money(subtotal)} />
        <Row label="Envío" value={money(Number(order.shipping_price ?? order.shipping_amount ?? 0))} />
        <Row
          label="Total"
          value={<span className="font-bold text-base">{money(Number(order.total_amount))}</span>}
        />
      </div>

      {/* Envío */}
      <div className="card-base">
        <h2 className="text-base font-bold mb-3">Envío</h2>
        <Row
          label="Tipo"
          value={
            order.shipping_type === "D"
              ? "Domicilio"
              : order.shipping_type === "S"
              ? "Sucursal"
              : order.shipping_type
          }
        />
        <Row label="Precio" value={money(Number(order.shipping_price ?? order.shipping_amount ?? 0))} />
        <Row label="Sucursal" value={order.shipping_agency_code} />
        <Row label="Shipping ID" value={order.shipping_id} />
        <Row label="Tracking" value={order.tracking_number} />
        <Row label="Estado envío" value={order.shipping_status} />
      </div>

      {/* Tracking events */}
      {trackingEvents.length > 0 && (
        <div className="card-base">
          <h2 className="text-base font-bold mb-3">Historial de tracking</h2>
          <div className="space-y-3">
            {trackingEvents
              .slice()
              .reverse()
              .map((ev, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{ev.status ?? "Evento"}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {ev.date ? String(ev.date) : ""}
                      {ev.location ? ` · ${ev.location}` : ""}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card-base">
        <h2 className="text-base font-bold mb-3">Productos</h2>
        <div className="space-y-0">
          {(items ?? []).map((item) => {
            const prod = item.products as { name?: string; category?: string } | null;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {prod?.name ?? "Producto eliminado"}
                  </p>
                  {prod?.category && (
                    <p className="text-xs text-slate-500">{prod.category}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{money(Number(item.price_at_purchase) * item.quantity)}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} × {money(Number(item.price_at_purchase))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-3 flex justify-between items-center">
          <span className="text-sm text-slate-500">{items?.length ?? 0} producto(s)</span>
          <span className="font-bold text-base">{money(Number(order.total_amount))}</span>
        </div>
      </div>
    </section>
  );
}