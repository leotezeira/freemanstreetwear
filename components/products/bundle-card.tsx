"use client";

import Link from "next/link";
import type { Bundle } from "@/types/bundle";
import { StarRating } from "@/components/ratings/star-rating";

type BundleCardProps = {
  bundle: Bundle;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

export function BundleCard({ bundle }: BundleCardProps) {
  const savings = bundle.compare_at_price ? bundle.compare_at_price - bundle.price : 0;
  const savingsPercent = bundle.compare_at_price
    ? Math.round((savings / bundle.compare_at_price) * 100)
    : 0;

  return (
    <Link href={`/bundles/${bundle.slug ?? "#"}`} prefetch={true}>
      <article className="bundle-card group flex h-full flex-col cursor-pointer">
        {/* === IMAGEN CONTAINER === */}
        <div className="relative w-full overflow-hidden transition-transform duration-300 group-hover:-translate-y-1">
          <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
            {bundle.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bundle.image_path}
                alt={bundle.name}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <span className="text-sm">Sin imagen</span>
              </div>
            )}
          </div>
        </div>

        {/* === CONTENIDO MINIMALISTA === */}
        <div className="flex flex-1 flex-col justify-between gap-2 pt-3">
          {/* Nombre del bundle */}
          <h3 className="bundle-title line-clamp-2 text-slate-900 dark:text-slate-50">
            {bundle.name}
          </h3>

          {/* Descripción */}
          {bundle.description && (
            <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
              {bundle.description}
            </p>
          )}

          {/* Cantidad de productos */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {bundle.bundle_items.length} producto{bundle.bundle_items.length !== 1 ? "s" : ""}
          </p>

          {/* Precio */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              {bundle.compare_at_price && savings > 0 ? (
                <>
                  <span className="bundle-price font-medium text-slate-500 line-through dark:text-slate-400">
                    {formatPrice(bundle.compare_at_price)}
                  </span>
                  <span className="bundle-price font-bold text-slate-900 dark:text-slate-50">
                    {formatPrice(bundle.price)}
                  </span>
                </>
              ) : (
                <span className="bundle-price font-bold text-slate-900 dark:text-slate-50">
                  {formatPrice(bundle.price)}
                </span>
              )}
            </div>

            {/* Badge ahorro */}
            {bundle.compare_at_price && savings > 0 && (
              <p className="bundle-price text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Ahorrás {savingsPercent}%
                </span>
              </p>
            )}
          </div>

          {/* Rating */}
          <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
            <StarRating bundleId={bundle.id} />
          </div>
        </div>
      </article>
    </Link>
  );
}
