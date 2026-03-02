"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCartStore } from "@/lib/cart/store";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

export function CartSummary() {
  const subtotal = useCartStore((s) => s.totals.subtotal);
  const savings = useCartStore((s) => s.totals.savings);
  const shippingEstimate = useCartStore((s) => s.shippingEstimate);
  const canCheckout = useCartStore((s) => s.canCheckout);
  const itemsCount = useCartStore((s) => s.items.length);
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  const shippingPrice = shippingEstimate?.price ?? 0;
  const total = useMemo(() => subtotal + shippingPrice, [subtotal, shippingPrice]);

  const hasEstimate = Boolean(shippingEstimate && Number.isFinite(shippingEstimate.price));

  return (
    <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-50">Resumen</h3>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Subtotal</span>
          <span className="font-semibold">{formatMoney(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Envío estimado</span>
          <span className="font-semibold">{hasEstimate ? formatMoney(shippingPrice) : "Se calcula en checkout"}</span>
        </div>

        {savings > 0 ? (
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
            <span>Descuentos</span>
            <span className="font-semibold">- {formatMoney(savings)}</span>
          </div>
        ) : null}

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center justify-between text-slate-900 dark:text-slate-50">
          <span className="font-black">Total</span>
          <span className="text-lg font-black">{formatMoney(total)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Link
          href="/checkout"
          onClick={() => closeDrawer()}
          className={`btn-primary block w-full text-center ${
            !canCheckout || itemsCount === 0 ? "pointer-events-none opacity-50" : ""
          }`}
          aria-disabled={!canCheckout || itemsCount === 0}
        >
          Ir al checkout
        </Link>

        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => closeDrawer()}
        >
          Seguir comprando
        </button>
      </div>

      {itemsCount === 0 ? (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Agregá productos para continuar.</p>
      ) : null}

      {!canCheckout && itemsCount > 0 ? (
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Revisá los productos con advertencias antes de ir al checkout.
        </p>
      ) : null}
    </aside>
  );
}
