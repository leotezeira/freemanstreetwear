import Link from "next/link";
import { searchProductsByName } from "@/lib/services/products.service";
import { ProductCard } from "@/components/products/product-card";
import { getSupabasePublicServerClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ q?: string; min?: string; max?: string; category?: string; stock?: string; tags?: string; sort?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { q, min, max, category, stock, tags, sort } = await searchParams;
  const minPrice = min ? Number(min) : undefined;
  const maxPrice = max ? Number(max) : undefined;

  const selectedCategory = (category ?? "").trim();
  const inStockOnly = stock === "in";
  const selectedTags = (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const sortValue = (sort ?? "created_desc") as any;

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
  let loadError: string | null = null;
  try {
    products = await searchProductsByName({
      searchTerm: q,
      minPrice: typeof minPrice === "number" && !Number.isNaN(minPrice) ? minPrice : undefined,
      maxPrice: typeof maxPrice === "number" && !Number.isNaN(maxPrice) ? maxPrice : undefined,
      category: selectedCategory || undefined,
      tags: selectedTags.length ? selectedTags : undefined,
      inStockOnly,
      sort: sortValue === "price_asc" || sortValue === "price_desc" ? sortValue : "created_desc",
    });
  } catch (e) {
    loadError = e instanceof Error ? e.message : "No se pudieron cargar productos";
    products = [];
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
              {loadError ? "0 resultados" : `${products.length} resultados`}
            </p>

            <form method="GET" className="flex items-center gap-2">
              <input type="hidden" name="q" value={q ?? ""} />
              <input type="hidden" name="min" value={min ?? ""} />
              <input type="hidden" name="max" value={max ?? ""} />
              <input type="hidden" name="category" value={selectedCategory} />
              <input type="hidden" name="stock" value={inStockOnly ? "in" : "all"} />
              <input type="hidden" name="tags" value={selectedTags.join(",")} />

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

          {loadError ? (
            <div className="card-base">
              <p className="text-sm font-semibold">No se pudieron cargar productos</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {!loadError && products.length === 0 ? <p className="text-sm text-slate-500">No hay productos para mostrar.</p> : null}
        </section>
      </div>

      <div id="filters" className="sr-only" />
    </main>
  );
}
