// =====================================================
// PÁGINA: /bundles
// Lista todos los bundles activos
// =====================================================

import { getActiveBundles } from "@/lib/services/bundles.service";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

export default async function BundlesPage() {
  const bundles = await getActiveBundles();

  return (
    <main className="app-container py-10">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight">Bundles</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Combos de productos con precios especiales. ¡Ahorrá comprando juntos!
        </p>
      </div>

      {bundles.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            No hay bundles disponibles por el momento.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => {
            const savings = bundle.compare_at_price
              ? bundle.compare_at_price - bundle.price
              : 0;
            const savingsPercent = bundle.compare_at_price
              ? Math.round((savings / bundle.compare_at_price) * 100)
              : 0;

            return (
              <Link
                key={bundle.id}
                href={`/bundles/${bundle.slug}`}
                className="group card-base space-y-3 transition hover:shadow-lg"
              >
                <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                  {bundle.image_path ? (
                    <img
                      src={bundle.image_path}
                      alt={bundle.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <span className="text-sm">Sin imagen</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 group-hover:underline">
                    {bundle.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {bundle.description ?? "Combo especial de productos"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Elegí {bundle.required_quantity} productos
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {formatMoney(bundle.price)}
                  </span>
                  {bundle.compare_at_price && (
                    <>
                      <span className="text-sm line-through text-slate-400">
                        {formatMoney(bundle.compare_at_price)}
                      </span>
                      {savings > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          Ahorrás {savingsPercent}%
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{bundle.bundle_items.length} productos disponibles</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
