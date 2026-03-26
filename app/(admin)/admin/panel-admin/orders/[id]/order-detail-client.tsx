"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, Package, Truck } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products: { name?: string; category?: string } | null;
  size?: string | null;
  color?: string | null;
};

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  postal_code: string | null;
  total_amount: number;
  shipping_amount: number | null;
  shipping_type: "D" | "S" | null;
  shipping_price: number | null;
  shipping_agency_code: string | null;
  payment_status: "pending" | "approved" | "rejected" | null;
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  order_number: string | null;
  shipping_status: string | null;
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
    s === "approved"
      ? "Aprobado"
      : s === "pending"
      ? "Pendiente"
      : s === "rejected"
      ? "Rechazado"
      : status || "—";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${styles}`}
    >
      {label}
    </span>
  );
}

function ShippingStatusPill({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  const styles =
    s === "shipped"
      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
      : s === "delivered"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
      : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  const label =
    s === "shipped"
      ? "Enviado"
      : s === "delivered"
      ? "Entregado"
      : "Pendiente";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${styles}`}
    >
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

export default function AdminOrderDetailClient({
  order,
  items,
}: {
  order: Order;
  items: OrderItem[];
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status ?? "pending");
  const [shippingStatus, setShippingStatus] = useState(order.shipping_status ?? null);

  async function updatePaymentStatus(newStatus: "pending" | "approved" | "rejected") {
    startTransition(async () => {
      try {
        const res = await fetch(`/admin/panel-admin/orders/${order.id}/payment-status`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ payment_status: newStatus }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error al actualizar" }));
          throw new Error(body.error ?? "Error al actualizar");
        }

        setPaymentStatus(newStatus);
        toast.push({
          variant: "success",
          title: "Estado actualizado",
          description: `El pago ahora está ${newStatus === "approved" ? "aprobado" : newStatus === "rejected" ? "rechazado" : "pendiente"}.`,
        });
      } catch (e) {
        toast.push({
          variant: "error",
          title: "Error",
          description: e instanceof Error ? e.message : "No se pudo actualizar el estado",
        });
      }
    });
  }

  async function updateShippingStatus(newStatus: "pending" | "shipped" | "delivered") {
    startTransition(async () => {
      try {
        const res = await fetch(`/admin/panel-admin/orders/${order.id}/shipping-status`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ shipping_status: newStatus }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error al actualizar" }));
          throw new Error(body.error ?? "Error al actualizar");
        }

        setShippingStatus(newStatus);
        toast.push({
          variant: "success",
          title: "Estado de envío actualizado",
          description: `El envío ahora está ${newStatus === "shipped" ? "enviado" : newStatus === "delivered" ? "entregado" : "pendiente"}.`,
        });
      } catch (e) {
        toast.push({
          variant: "error",
          title: "Error",
          description: e instanceof Error ? e.message : "No se pudo actualizar el estado",
        });
      }
    });
  }

  const subtotal = items.reduce(
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
            Pedido {order.order_number ?? String(order.id).slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {order.created_at ? new Date(order.created_at).toLocaleString("es-AR") : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusPill status={paymentStatus ?? ""} />
          <ShippingStatusPill status={shippingStatus} />
        </div>
      </div>

      {/* Acciones de estado */}
      <div className="card-base space-y-4">
        <h2 className="text-base font-bold">Actualizar Estado</h2>
        
        {/* Estado del pago */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Estado del Pago:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updatePaymentStatus("pending")}
              disabled={isPending || paymentStatus === "pending"}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                paymentStatus === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300"
              }`}
            >
              ⏳ Pendiente
            </button>
            <button
              type="button"
              onClick={() => updatePaymentStatus("approved")}
              disabled={isPending || paymentStatus === "approved"}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                paymentStatus === "approved"
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300"
              }`}
            >
              ✅ Aprobado
            </button>
            <button
              type="button"
              onClick={() => updatePaymentStatus("rejected")}
              disabled={isPending || paymentStatus === "rejected"}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                paymentStatus === "rejected"
                  ? "bg-red-500 text-white"
                  : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              ❌ Rechazado
            </button>
          </div>
        </div>

        {/* Estado del envío */}
        <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Estado del Envío:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateShippingStatus("pending")}
              disabled={isPending || shippingStatus === "pending" || shippingStatus === "delivered"}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1 ${
                shippingStatus === "pending"
                  ? "bg-slate-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              } ${shippingStatus === "delivered" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Package className="h-4 w-4" />
              Pendiente
            </button>
            <button
              type="button"
              onClick={() => updateShippingStatus("shipped")}
              disabled={isPending || shippingStatus === "shipped" || shippingStatus === "delivered"}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1 ${
                shippingStatus === "shipped"
                  ? "bg-blue-500 text-white"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
              } ${shippingStatus === "delivered" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Truck className="h-4 w-4" />
              Enviado
            </button>
            <button
              type="button"
              onClick={() => updateShippingStatus("delivered")}
              disabled={isPending || shippingStatus === "delivered"}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1 ${
                shippingStatus === "delivered"
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Entregado
            </button>
          </div>
        </div>
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
        <Row label="Estado" value={<StatusPill status={paymentStatus ?? ""} />} />
        <Row label="Proveedor" value={order.payment_provider} />
        <Row label="Referencia" value={order.payment_reference} />
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
              : order.shipping_type ?? "—"
          }
        />
        <Row label="Precio" value={money(Number(order.shipping_price ?? order.shipping_amount ?? 0))} />
        <Row label="Sucursal / Código" value={order.shipping_agency_code} />
      </div>

      {/* Productos */}
      <div className="card-base">
        <h2 className="text-base font-bold mb-3">Productos</h2>
        <div className="space-y-0">
          {items.map((item) => {
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
                  {(item.size || item.color) && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {item.size && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Talle: {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Color: {item.color}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">
                    {money(Number(item.price_at_purchase) * item.quantity)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} × {money(Number(item.price_at_purchase))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-3 flex justify-between items-center">
          <span className="text-sm text-slate-500">{items.length} producto(s)</span>
          <span className="font-bold text-base">{money(Number(order.total_amount))}</span>
        </div>
      </div>
    </section>
  );
}
