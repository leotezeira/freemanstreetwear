"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/domain";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { ShoppingCart } from "lucide-react";
import { INSTALLMENT_PLANS, TRANSFER_DISCOUNT_PERCENT, BADGE_RULES } from "@/lib/config/pricing";

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

function getBestInstallment(price: number) {
  const applicable = INSTALLMENT_PLANS.filter((p) => price >= p.minAmount);
  const best = applicable[applicable.length - 1];
  return {
    quantity: best.quantity,
    amount: Math.round(price / best.quantity),
  };
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
  const router = useRouter();
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
  const installment = getBestInstallment(price);
  const hasDiscount = !!discountPct;
  const isDrop = !outOfStock && !discountPct && showDropBadge(product.created_at);
  const isLastUnits = !outOfStock && showLastUnits(product.stock);

  return (
    <article
      className="group cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/product/${product.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/product/${product.id}`);
        }
      }}
    >
      <div className="relative block overflow-hidden rounded-2xl bg-transparent transition hover:-translate-y-0.5">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-transparent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl ?? "/product-placeholder.svg"}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-105"
            loading="lazy"
          />

          {hoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hoverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-200 group-hover:opacity-100"
              loading="lazy"
            />
          ) : null}

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {outOfStock ? (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Agotado
              </span>
            ) : (
              <>
                {isDrop && (
                  <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg">
                    🔥 DROP
                  </span>
                )}
                {discountPct && (
                  <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    -{discountPct}%
                  </span>
                )}
                {!isDrop && showNew && (
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    NEW IN
                  </span>
                )}
                {isLastUnits && (
                  <span className="rounded-full border-2 border-red-500 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-600">
                    ⚠️ Últimas
                  </span>
                )}
              </>
            )}
          </div>

          {/* Hover add-to-cart (desktop only) */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 hidden lg:block">
            <button
              type="button"
              className="btn-primary pointer-events-auto w-full"
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
              style={{ opacity: 0, transform: "translateY(6px)", transition: "all 200ms ease" }}
              data-hover-btn
            >
              <span className="flex items-center justify-center gap-2">
                <Icon icon={ShoppingCart} />
                <span>{outOfStock ? "Agotado" : "Agregar al carrito"}</span>
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5 p-4">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-50">{product.name}</h3>

          <div className="space-y-1">
            {/* Precio principal + descuento */}
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-sm font-semibold text-slate-500 line-through dark:text-slate-400">
                    {formatPrice(price)}
                  </span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {formatPrice(transferPrice)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-black text-slate-900 dark:text-slate-50">
                  {formatPrice(price)}
                </span>
              )}
            </div>

            {/* Precio con transferencia (si no hay descuento) */}
            {!hasDiscount && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(transferPrice)}</span> con
                Transferencia
              </p>
            )}

            {/* Cuotas sin interés */}
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              en {installment.quantity} cuotas sin interés de <span className="font-bold">{formatPrice(installment.amount)}</span>
            </p>
          </div>

          {/* Urgencia: unidades disponibles */}
          {isLastUnits && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              ⚠️ Solo quedan {product.stock} {product.stock === 1 ? "unidad" : "unidades"}
            </p>
          )}
        </div>
      </div>

      {/* Accesible fallback link (sr-only) */}
      <Link href={`/product/${product.id}`} className="sr-only">
        {product.name}
      </Link>

      <style jsx>{`
        article:hover [data-hover-btn] {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </article>
  );
}
