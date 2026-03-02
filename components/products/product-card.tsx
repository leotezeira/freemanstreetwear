"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/domain";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { ShoppingCart } from "lucide-react";

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
  return days <= 14;
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
      <div className="relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
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

          <div className="absolute left-3 top-3 flex items-center gap-2">
            {outOfStock ? (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-50 dark:text-slate-950">
                Agotado
              </span>
            ) : discountPct ? (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-50 dark:text-slate-950">
                -{discountPct}%
              </span>
            ) : showNew ? (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-50 dark:text-slate-950">
                Nuevo
              </span>
            ) : null}
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

        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-50">{product.name}</h3>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-50">{formatPrice(price)}</span>
            {discountPct ? (
              <span className="text-sm font-semibold text-slate-500 line-through dark:text-slate-400">
                {formatPrice(compareAt)}
              </span>
            ) : null}
          </div>
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
