import Link from "next/link";
import { searchProductsByName } from "@/lib/services/products.service";
import { ProductCard } from "@/components/products/product-card";
import { getSupabasePublicServerClient } from "@/lib/supabase/public";
import { getActiveBundles } from "@/lib/services/bundles.service";

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ q?: string; min?: string; max?: string; category?: string; stock?: string; tags?: string; sort?: string; type?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { q, min, max, category, stock, tags, sort, type } = await searchParams;
  const minPrice = min ? Number(min) : undefined;
  const maxPrice = max ? Number(max) : undefined;

  const selectedCategory = (category ?? "").trim();
  const inStockOnly = stock === "in";
  const selectedTags = (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const sortValue = (sort ?? "created_desc") as any;
  const showType = (type ?? "all") as "all" | "products" | "bundles";

  const supabase = getSupabasePublicServerClient();
  const { data: categoriesRow } = await supabase.from("site_content").select("value").eq("key", "categories").maybeSingle();
  const categories = ((categoriesRow?.value as string[] | null) ?? []).filter(Boolean);

  const { data: tagRows } = await supabase.from("products").select("tags").eq("is_active", true).limit(400);
  const tagSuggestions = Array.from(
    new Set(
      (tagRows ?? [])
        .flatMap((r: any) => (Array.isArray(r?.tags) ? r.tags : []))
        .map((t: any) => String(t).trim())
        .filter(Boolean)
    )
  ).slice(0, 60);

  let products: any[] = [];
  let bundles: any[] = [];
  let loadError: string | null = null;

  // Cargar bundles si corresponde
  if (showType === "all" || showType === "bundles") {
    try {
      const bundlesData = await getActiveBundles();
      bundles = bundlesData.map((b) => ({
        ...b,
        _type: "bundle" as const,
      }));
    } catch (e) {
      console.error("[ShopPage] Bundles error:", e);
    }
  }

  // Cargar productos si corresponde
  if (showType === "all" || showType === "products") {
    try {
      products = await searchProductsByName({
        searchTerm: q,
        minPrice: typeof minPrice === "number" && !Number.isNaN(minPrice) ? minPrice : undefined,
        maxPrice: typeof maxPrice === "number" && !Number.isNaN(maxPrice) ? maxPrice : undefined,
        category: selectedCategory || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        inStockOnly,
        sort: sortValue === "created_desc" || sortValue === "price_asc" || sortValue === "price_desc" ? sortValue : "created_desc",
      });
    } catch (e) {
      loadError = e instanceof Error ? e.message : "No se pudieron cargar productos";
      products = [];
    }
  }

  // Filtrar por búsqueda si hay query
  if (q && q.trim()) {
    const query = q.toLowerCase().trim();
    bundles = bundles.filter((b) => b.name.toLowerCase().includes(query) || b.description?.toLowerCase().includes(query));
  }

  // Combinar y ordenar
  const allItems = [...bundles, ...products.map((p) => ({ ...p, _type: "product" as const }))];

  // Ordenar
  if (sortValue === "price_asc") {
    allItems.sort((a, b) => a.price - b.price);
  } else if (sortValue === "price_desc") {
    allItems.sort((a, b) => b.price - a.price);
  } else if (sortValue === "created_desc") {
    // Bundles primero, luego productos por fecha
    allItems.sort((a, b) => {
      if (a._type === "bundle" && b._type === "product") return -1;
      if (a._type === "product" && b._type === "bundle") return 1;
      return 0;
    });
  }

  const clearHref = "/shop";

  return (
    <main className="app-container py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Shop</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Explorá el catálogo con filtros y ordenamiento.</p>
        </div>
        <Link href={clearHref} className="btn-ghost">
          Limpiar filtros
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar filtros */}
        <aside className="space-y-4">
          <details open className="card-base">
            <summary className="cursor-pointer text-lg font-bold">Filtros</summary>
            <form className="mt-4 grid gap-3" method="GET">
              <input type="search" name="q" placeholder="Buscar" defaultValue={q ?? ""} className="input-base" />

              <select name="category" defaultValue={selectedCategory} className="input-base">
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input type="number" name="min" placeholder="Mín" defaultValue={min ?? ""} className="input-base" min={0} />
                <input type="number" name="max" placeholder="Máx" defaultValue={max ?? ""} className="input-base" min={0} />
              </div>

              <select name="stock" defaultValue={inStockOnly ? "in" : "all"} className="input-base">
                <option value="all">Disponibilidad</option>
                <option value="in">En stock</option>
              </select>

              <input
                name="tags"
                className="input-base"
                placeholder="Etiquetas (coma)"
                defaultValue={selectedTags.join(", ")}
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {tagSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo</label>
                <select name="type" defaultValue={showType} className="input-base">
                  <option value="all">Todos</option>
                  <option value="products">Productos</option>
                  <option value="bundles">Packs</option>
                </select>
              </div>

              <input type="hidden" name="sort" value={sort ?? "created_desc"} />
              <button className="btn-primary w-full" type="submit">
                Aplicar filtros
              </button>
            </form>
          </details>

          {/* Mobile-first: atajo sticky a filtros */}
          <div className="lg:hidden">
            <a href="#filters" className="btn-secondary w-full">
              Ver filtros
            </a>
          </div>
        </aside>

        {/* Grid + sort */}
        <section className="space-y-4">
          <div className="card-base flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {loadError && allItems.length === 0 ? "0 resultados" : `${allItems.length} resultados`}
            </p>

            <form method="GET" className="flex items-center gap-2">
              <input type="hidden" name="q" value={q ?? ""} />
              <input type="hidden" name="min" value={min ?? ""} />
              <input type="hidden" name="max" value={max ?? ""} />
              <input type="hidden" name="category" value={selectedCategory} />
              <input type="hidden" name="stock" value={inStockOnly ? "in" : "all"} />
              <input type="hidden" name="tags" value={selectedTags.join(",")} />
              <input type="hidden" name="type" value={showType} />

              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ordenar</label>
              <select name="sort" defaultValue={sort ?? "created_desc"} className="input-base max-w-[220px]">
                <option value="created_desc">Más recientes</option>
                <option value="price_asc">Precio menor</option>
                <option value="price_desc">Precio mayor</option>
              </select>
              <button className="btn-secondary" type="submit">
                Aplicar
              </button>
            </form>
          </div>

          {loadError && allItems.length === 0 ? (
            <div className="card-base">
              <p className="text-sm font-semibold">No se pudieron cargar productos</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {allItems.map((item) => {
                if (item._type === "bundle") {
                  return (
                    <Link
                      key={item.id}
                      href={`/bundles/${item.slug}`}
                      className="group card-base space-y-3 transition hover:shadow-lg"
                    >
                      <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                        {item.image_path ? (
                          <img
                            src={item.image_path}
                            alt={item.name}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const placeholder = target.parentElement?.querySelector('.bundle-placeholder') as HTMLElement | null;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="bundle-placeholder flex h-full items-center justify-center text-slate-400"
                          style={{ display: item.image_path ? 'none' : 'flex' }}
                        >
                          <span className="text-sm">Pack</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            Pack
                          </span>
                        </div>
                        <h3 className="mt-1 font-bold text-slate-900 dark:text-slate-50 group-hover:underline">
                          {item.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                          {item.description ?? "Combo especial"}
                        </p>
                        {item.min_items && item.max_items && (
                          <p className="mt-1 text-xs text-slate-500">
                            Elegí {item.min_items}{item.min_items !== item.max_items ? ` a ${item.max_items}` : ""} productos
                          </p>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                          {formatMoney(item.price)}
                        </span>
                        {item.compare_at_price && (
                          <span className="text-sm line-through text-slate-400">
                            {formatMoney(item.compare_at_price)}
                          </span>
                        )}
                      </div>

                      {item.compare_at_price && item.compare_at_price > item.price && (
                        <div className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          Ahorrás {formatMoney(item.compare_at_price - item.price)}
                        </div>
                      )}
                    </Link>
                  );
                }

                return <ProductCard key={item.id} product={item} />;
              })}
            </div>
          )}

          {!loadError && allItems.length === 0 ? (
            <p className="text-sm text-slate-500">No hay productos para mostrar.</p>
          ) : null}
        </section>
      </div>

      <div id="filters" className="sr-only" />
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}
