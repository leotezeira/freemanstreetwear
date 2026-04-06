"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { useCartStore } from "@/lib/cart/store";
import type { CartStoredLineItem } from "@/lib/cart/utils";
import { Package2 } from "lucide-react";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

export function CartSummary() {
  const subtotal = useCartStore((s) => s.totals.subtotal);
  const savings = useCartStore((s) => s.totals.savings);
  const shippingEstimate = useCartStore((s) => s.shippingEstimate);
  const canCheckout = useCartStore((s) => s.canCheckout);
  const items = useCartStore((s) => s.items);
  const itemsCount = items.length;
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  const shippingPrice = shippingEstimate?.price ?? 0;
  const total = useMemo(() => subtotal + shippingPrice, [subtotal, shippingPrice]);

  const hasEstimate = Boolean(shippingEstimate && Number.isFinite(shippingEstimate.price));

  const { standaloneItems, bundleGroups } = useMemo(() => {
    const groups = new Map<string, CartStoredLineItem[]>();
    const standalone: CartStoredLineItem[] = [];

    items.forEach((item) => {
      if (item.bundleGroupId) {
        const existing = groups.get(item.bundleGroupId);
        if (existing) {
          existing.push(item);
        } else {
          groups.set(item.bundleGroupId, [item]);
        }
      } else {
        standalone.push(item);
      }
    });

    return {
      standaloneItems: standalone,
      bundleGroups: Array.from(groups.entries()),
    };
  }, [items]);

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

        {itemsCount > 0 ? (
          <div className="space-y-2 border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800">
            {standaloneItems.map((it) => (
              <div
                key={`${it.productId}-${it.variantId ?? "base"}`}
                className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200"
              >
                <span>
                  {it.name} × {it.quantity}
                </span>
                <span className="text-slate-900 dark:text-slate-50">
                  {formatMoney(it.unitPrice * it.quantity)}
                </span>
              </div>
            ))}

            {bundleGroups.map(([groupId, bundleItems]) => {
              const bundleTotal = bundleItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
              return (
                <div
                  key={groupId}
                  className="space-y-1 border-t border-slate-200 pt-2 text-sm text-slate-600 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      <Icon icon={Package2} size={14} />
                      Bundle ({bundleItems.length} productos)
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {formatMoney(bundleTotal)}
                    </span>
                  </div>
                  <div className="ml-4 flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                    {bundleItems.map((it) => (
                      <span key={`${it.productId}-${it.variantId ?? "base"}`}>
                        {it.name} × {it.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

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
