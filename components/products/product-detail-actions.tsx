"use client";

import { useMemo, useState } from "react";
import type { ProductVariant } from "@/types/domain";
import { ProductActions } from "@/components/products/product-actions";
import { VariantSelector, type SelectedVariant } from "@/components/products/variant-selector";
import { StarRating } from "@/components/ratings/star-rating";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

function getDiscountPercent(price: number, compareAt: number) {
  if (!Number.isFinite(price) || !Number.isFinite(compareAt) || compareAt <= 0) return null;
  if (compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

type Props = {
  productId: string;
  productName: string;
  basePrice: number;
  compareAtPrice: number | null;
  baseStock: number;
  variants: ProductVariant[];
  imageUrl: string | null;
  weight_grams?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
};

export function ProductDetailActions({
  productId,
  productName,
  basePrice,
  compareAtPrice,
  baseStock,
  variants,
  imageUrl,
  weight_grams,
  height,
  width,
  length,
}: Props) {
  const toast = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const [selected, setSelected] = useState<SelectedVariant>({
    variantId: null,
    size: null,
    color: null,
    price: basePrice,
    stock: baseStock,
  });

  const discountPct = useMemo(() => {
    if (!compareAtPrice) return null;
    return getDiscountPercent(selected.price, compareAtPrice);
  }, [selected.price, compareAtPrice]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl font-black">{formatPrice(selected.price)}</p>
          {discountPct && compareAtPrice ? (
            <>
              <p className="text-base font-semibold text-slate-500 line-through dark:text-slate-400">{formatPrice(compareAtPrice)}</p>
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-50 dark:text-slate-950">
                -{discountPct}%
              </span>
            </>
          ) : null}
        </div>
        {discountPct && compareAtPrice ? (
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ahorrás {formatPrice(compareAtPrice - selected.price)}
          </p>
        ) : null}

        <StarRating productId={productId} />
      </div>

      <VariantSelector variants={variants} basePrice={basePrice} baseStock={baseStock} onChange={setSelected} />

      <p className="text-sm font-semibold">
        {selected.stock > 0 ? (
          <span className="text-emerald-700 dark:text-emerald-300">Disponible ({selected.stock} en stock)</span>
        ) : (
          <span className="text-red-600 dark:text-red-300">Sin stock</span>
        )}
      </p>

      <div className="hidden sm:block">
        <ProductActions
          productId={productId}
          productName={productName}
          unitPrice={selected.price}
          compareAtPrice={compareAtPrice}
          stock={selected.stock}
          variantId={selected.variantId}
          variantLabel={
            selected.size && selected.color
              ? `${selected.size} · ${selected.color}`
              : selected.size
                ? selected.size
                : selected.color
                  ? selected.color
                  : null
          }
          imageUrl={imageUrl}
          weight_grams={weight_grams ?? null}
          height={height ?? null}
          width={width ?? null}
          length={length ?? null}
        />
      </div>

      {/* Mobile sticky bar */}
      <div className="sm:hidden">
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="app-container flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-600 dark:text-slate-300">Total</p>
              <p className="text-lg font-black">{formatPrice(selected.price)}</p>
            </div>
            <button
              className="btn-primary ml-auto w-full"
              type="button"
              disabled={selected.stock <= 0}
              onClick={() => {
                const result = addToCart({
                  productId,
                  variantId: selected.variantId,
                  name: productName,
                  variantLabel:
                    selected.size && selected.color
                      ? `${selected.size} · ${selected.color}`
                      : selected.size
                        ? selected.size
                        : selected.color
                          ? selected.color
                          : null,
                  unitPrice: selected.price,
                  compareAtPrice: compareAtPrice ?? null,
                  quantity: 1,
                  imageUrl,
                  stock: selected.stock,
                  isActive: true,
                  weight_grams: weight_grams ?? null,
                  height: height ?? null,
                  width: width ?? null,
                  length: length ?? null,
                });

                if (!result.ok) {
                  toast.push({ variant: "error", title: "Carrito", description: result.reason });
                  return;
                }

                openDrawer();
                toast.push({
                  variant: result.clamped ? "info" : "success",
                  title: "Carrito",
                  description: result.clamped
                    ? "Agregado, pero se ajustó al stock disponible."
                    : "Producto agregado al carrito.",
                });
              }}
            >
              {selected.stock > 0 ? "Agregar al carrito" : "Agotado"}
            </button>
          </div>
        </div>
        <div className="h-24" />
      </div>
    </div>
  );
}
