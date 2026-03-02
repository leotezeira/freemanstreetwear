"use client";

import { memo, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AlertTriangle, BadgePercent, Minus, Plus, Trash2 } from "lucide-react";
import type { CartStoredLineItem } from "@/lib/cart/utils";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

export type CartItemRowProps = {
  item: CartStoredLineItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  disabled?: boolean;
};

export const CartItemRow = memo(function CartItemRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  disabled,
}: CartItemRowProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const unitPrice = Number(item.unitPrice);
  const compareAt = Number(item.compareAtPrice ?? 0);
  const hasOffer = Number.isFinite(compareAt) && compareAt > unitPrice;

  const lineTotal = useMemo(() => unitPrice * item.quantity, [unitPrice, item.quantity]);
  const compareTotal = useMemo(() => (hasOffer ? compareAt * item.quantity : 0), [hasOffer, compareAt, item.quantity]);

  const stock = typeof item.stock === "number" ? item.stock : null;
  const outOfStock = typeof stock === "number" && stock <= 0;
  const overStock = typeof stock === "number" && item.quantity > stock;
  const lowStock = typeof stock === "number" && stock > 0 && stock <= 3;
  const inactive = item.isActive === false;

  return (
    <article className="flex gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="h-16 w-16 flex-none overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={!imageFailed ? item.imageUrl ?? "/product-placeholder.svg" : "/product-placeholder.svg"}
          alt={item.name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{item.name}</p>
            {item.variantLabel ? (
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{item.variantLabel}</p>
            ) : null}

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{formatMoney(unitPrice)}</p>
              {hasOffer ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  <Icon icon={BadgePercent} size={16} />
                  Oferta
                </span>
              ) : null}
              {lowStock ? (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-slate-50 dark:text-slate-950">
                  Stock bajo
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:border-slate-900 disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-200"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Eliminar"
          >
            <Icon icon={Trash2} />
          </button>
        </div>

        {(inactive || outOfStock || overStock) && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            <Icon icon={AlertTriangle} />
            <div className="min-w-0">
              {inactive ? <p className="font-semibold">Este producto ya no está disponible.</p> : null}
              {outOfStock ? <p className="font-semibold">Sin stock.</p> : null}
              {overStock && typeof stock === "number" ? (
                <p className="font-semibold">Cantidad supera el stock ({stock}). Ajustá la cantidad para continuar.</p>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center disabled:opacity-50"
              onClick={onDecrease}
              disabled={disabled || item.quantity <= 1}
              aria-label="Disminuir"
            >
              <Icon icon={Minus} />
            </button>
            <span className="min-w-10 px-2 text-center text-sm font-semibold text-slate-900 dark:text-slate-50">
              {item.quantity}
            </span>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center disabled:opacity-50"
              onClick={onIncrease}
              disabled={disabled || outOfStock}
              aria-label="Aumentar"
            >
              <Icon icon={Plus} />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{formatMoney(lineTotal)}</p>
            {hasOffer ? (
              <p className="text-xs font-semibold text-slate-500 line-through dark:text-slate-400">{formatMoney(compareTotal)}</p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
});
