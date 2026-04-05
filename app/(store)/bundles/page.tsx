// =====================================================
// PÁGINA: /bundles
// Lista todos los bundles activos
// =====================================================

import { getActiveBundles } from "@/lib/services/bundles.service";
import { BundleCard } from "@/components/products/bundle-card";
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
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} />
          ))}
        </div>
      )}
    </main>
  );
}
