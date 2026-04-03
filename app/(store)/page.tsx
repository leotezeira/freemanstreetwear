import Link from "next/link";
import { ProductCard } from "@/components/products/product-card";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { getSiteContent } from "@/lib/services/content.service";
import { getActiveBanners, getBannerSettings } from "@/lib/services/hero-banners.service";
import { getActiveBundles } from "@/lib/services/bundles.service";
import { getFeaturedProducts, searchProductsByName } from "@/lib/services/products.service";

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

export default async function HomePage() {
  const content = await getSiteContent();
  const banners = await getActiveBanners().catch(() => []);
  const bundles = await getActiveBundles().catch(() => []);
  const bannerSettings = await getBannerSettings().catch(() => ({ interval_ms: 5000 }));

  let featuredProducts: any[] = [];
  let latestProducts: any[] = [];
  let loadError: string | null = null;

  try {
    latestProducts = await searchProductsByName({ sort: "created_desc" }).then((p) => p.slice(0, 12));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "No se pudieron cargar los productos";
    latestProducts = [];
  }

  try {
    featuredProducts = await getFeaturedProducts(4);
  } catch (e) {
    const featuredError = e instanceof Error ? e.message : "No se pudieron cargar los productos destacados";
    if (process.env.NODE_ENV !== "production") {
      console.error("[HomePage] Featured products fallback:", featuredError);
    }
    featuredProducts = [];
  }

  const showFeatured = featuredProducts.length ? featuredProducts : latestProducts.slice(0, 4);

  return (
    <main>
      {/* Top barra*/}
      {content.home.topBarText ? (
        <div className="top-bar">
          <div className="scroll-text">
            <span>{content.home.topBarText}</span>
            <span>{content.home.topBarText}</span>
          </div>
        </div>
      ) : null}
      {/* Hero */}
      {banners.length > 0 ? (
        <HeroCarousel banners={banners} intervalMs={bannerSettings.interval_ms} />
      ) : (
        <section className="app-container grid gap-8 py-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Freeman Streetwear</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">{content.home.heroTitle}</h1>
            <p className="max-w-xl text-base text-slate-600 dark:text-slate-300 md:text-lg">{content.home.heroSubtitle}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={content.home.heroCtaHref} className="btn-primary w-full sm:w-auto">
                {content.home.heroCtaLabel}
              </Link>
              <Link href="/shop" className="btn-secondary w-full sm:w-auto">
                Ver productos
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-soft dark:border-slate-800 dark:bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.home.heroImageUrl}
              alt="Hero Freeman Store"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Destacados */}
      <section className="app-container py-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Productos destacados</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Selección de temporada.</p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-slate-700 hover:text-accent dark:text-slate-200">
            Ver todos
          </Link>
        </div>

        {loadError ? (
          <div className="card-base">
            <p className="text-sm font-semibold">No se pudieron cargar productos</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {showFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Packs y Combos */}
      {bundles.length > 0 ? (
        <section className="app-container py-8">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Packs y Combos</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ofertas en combos seleccionados.</p>
            </div>
            <Link href="/bundles" className="text-sm font-semibold text-slate-700 hover:text-accent dark:text-slate-200">
              Ver todos
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {bundles.slice(0, 4).map((bundle) => {
              const savings = bundle.compare_at_price ? bundle.compare_at_price - bundle.price : 0;
              const savingsPercent = bundle.compare_at_price ? Math.round((savings / bundle.compare_at_price) * 100) : 0;

              return (
                <Link
                  key={bundle.id}
                  href={`/bundles/${bundle.slug ?? "#"}`}
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
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 group-hover:underline">{bundle.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{bundle.description ?? "Combo especial de productos"}</p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-50">{formatMoney(bundle.price)}</span>
                    {bundle.compare_at_price && (
                      <>
                        <span className="text-sm line-through text-slate-400">{formatMoney(bundle.compare_at_price)}</span>
                        {savings > 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            Ahorrás {savingsPercent}%
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">{bundle.bundle_items.length} productos</p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Todos los productos */}
      <section className="app-container py-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Todos los productos</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Últimos ingresos disponibles.</p>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-slate-700 hover:text-accent dark:text-slate-200">
            Explorar shop
          </Link>
        </div>

        {!loadError ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {latestProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      {/* Banner promo */}
      <section className="app-container py-8">
        <div className="card-base bg-slate-900 text-white dark:bg-slate-900">
          <h3 className="text-2xl font-bold">{content.home.promoTitle}</h3>
          <p className="mt-2 text-slate-200">{content.home.promoSubtitle}</p>
        </div>
      </section>
    </main>
  );
}
