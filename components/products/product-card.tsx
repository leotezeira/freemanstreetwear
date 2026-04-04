"use client";

import Link from "next/link";
import type { Product } from "@/types/domain";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { ShoppingCart } from "lucide-react";
import { TRANSFER_DISCOUNT_PERCENT, BADGE_RULES } from "@/lib/config/pricing";
import { StarRating } from "@/components/ratings/star-rating";

type ProductCardProps = {
  product: Product;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

function getDiscountPercent(price: number, compareAt: number) {
  if (!Number.isFinite(price) || !Number.isFinite(compareAt) || compareAt <= 0) return null;
  if (compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function isNew(createdAt: string) {
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return false;
  const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return days <= BADGE_RULES.NEW_IN_DAYS;
}

function getTransferPrice(price: number) {
  return Math.round(price * (1 - TRANSFER_DISCOUNT_PERCENT / 100));
}

function showDropBadge(createdAt: string) {
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return false;
  const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return days <= BADGE_RULES.DROP_THRESHOLD;
}

function showLastUnits(stock: number) {
  return stock > 0 && stock <= BADGE_RULES.LAST_UNITS_THRESHOLD;
}

export function ProductCard({ product }: ProductCardProps) {
  const toast = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const imageUrl = (product as Product & { primary_image_url?: string | null }).primary_image_url;
  const hoverUrl = (product as Product & { hover_image_url?: string | null }).hover_image_url;

  const price = Number(product.price);
  const compareAt = Number((product as any).compare_at_price ?? (product as any).compareAtPrice ?? 0);
  const discountPct = getDiscountPercent(price, compareAt);
  const outOfStock = product.stock <= 0;
  const showNew = !outOfStock && !discountPct && isNew(product.created_at);
  const transferPrice = getTransferPrice(price);
  const hasDiscount = !!discountPct;
  const isDrop = !outOfStock && !discountPct && showDropBadge(product.created_at);
  const isLastUnits = !outOfStock && showLastUnits(product.stock);

  return (
    <Link href={`/product/${product.id}`} prefetch={true}>
      <article className="group flex h-full flex-col cursor-pointer">
        {/* === IMAGEN CONTAINER === */}
        <div className="relative w-full overflow-hidden rounded-lg transition-transform duration-300 group-hover:-translate-y-1">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
            {/* Imagen principal */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl ?? "/product-placeholder.svg"}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />

            {/* Imagen hover (2da imagen) */}
            {hoverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hoverUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
                loading="lazy"
                decoding="async"
              />
            )}

            {/* === BADGES (esquina superior izquierda) === */}
            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {outOfStock && (
                <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                  Agotado
                </span>
              )}
              {!outOfStock && isDrop && (
                <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                  🔥 DROP
                </span>
              )}
              {!outOfStock && discountPct && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  -{discountPct}%
                </span>
              )}
              {!outOfStock && !isDrop && showNew && (
                <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                  NEW
                </span>
              )}
              {!outOfStock && isLastUnits && (
                <span className="rounded-full border-2 border-red-500 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                  ⚠️ Últimas
                </span>
              )}
            </div>

            {/* === BOTÓN HOVER (solo desktop) === */}
            <div className="pointer-events-none absolute inset-x-2 bottom-2 hidden lg:block">
              <button
                type="button"
                className="btn-primary pointer-events-auto w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                disabled={outOfStock}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const result = addToCart({
                    productId: product.id,
                    variantId: null,
                    name: product.name,
                    unitPrice: price,
                    compareAtPrice: Number.isFinite(compareAt) && compareAt > 0 ? compareAt : null,
                    quantity: 1,
                    imageUrl: imageUrl ?? null,
                    stock: product.stock,
                    isActive: product.is_active,
                    weight_grams: product.weight_grams ?? null,
                    height: product.height ?? null,
                    width: product.width ?? null,
                    length: product.length ?? null,
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
                <span className="flex items-center justify-center gap-2">
                  <Icon icon={ShoppingCart} />
                  <span>{outOfStock ? "Agotado" : "Agregar"}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* === CONTENIDO MINIMALISTA (nombre + precio) === */}
        <div className="flex flex-1 flex-col justify-between gap-2 pt-3">
          {/* Nombre del producto */}
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-50">
            {product.name}
          </h3>

          {/* Precio */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-xs font-medium text-slate-500 line-through dark:text-slate-400">
                    {formatPrice(compareAt)}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-50">
                    {formatPrice(price)}
                  </span>
                </>
              ) : (
                <span className="font-bold text-slate-900 dark:text-slate-50">
                  {formatPrice(price)}
                </span>
              )}
            </div>

            {/* Opción de transferencia */}
            {!hasDiscount && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(transferPrice)}
                </span>
                {" "}con Transferencia
              </p>
            )}
          </div>

          {/* Star Rating */}
          <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
            <StarRating productId={product.id} />
          </div>

          {/* Urgencia */}
          {isLastUnits && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              ⚠️ {product.stock} unidad{product.stock === 1 ? "" : "es"}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
