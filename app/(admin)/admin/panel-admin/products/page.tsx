import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSignedProductImageUrl } from "@/lib/services/product-images.service";
import { ListFilters } from "@/components/admin/list-filters";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toStringParam(value: string | string[] | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function toIntParam(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function money(value: number) {
  return `$${Number(value).toLocaleString("es-AR")}`;
}

async function bulkSetActive(formData: FormData) {
  "use server";

  const action = String(formData.get("action") ?? "");
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) {
    return;
  }

  const nextValue = action === "activate";
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("products").update({ is_active: nextValue }).in("id", ids);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/panel-admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

async function duplicateProduct(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const supabase = getSupabaseAdminClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      "name, description, price, compare_at_price, stock, category, tags, weight_grams, meta_title, meta_description, slug"
    )
    .eq("id", id)
    .maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!product) throw new Error("Producto no encontrado");

  const slugBase = (product.slug ?? "").slice(0, 40);
  const newSlug = slugBase ? `${slugBase}-${crypto.randomUUID().slice(0, 8)}` : crypto.randomUUID();

  const { data: inserted, error: insertError } = await supabase
    .from("products")
    .insert({
      ...product,
      name: `${product.name} (copia)`,
      slug: newSlug,
      is_active: false,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase.from("product_variants").select("size, color, sku, stock, price").eq("product_id", id),
    supabase
      .from("product_images")
      .select("image_path, sort_order, is_primary")
      .eq("product_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (variants?.length) {
    const { error } = await supabase
      .from("product_variants")
      .insert(variants.map((v) => ({ ...v, product_id: inserted.id })));
    if (error) throw new Error(error.message);
  }

  if (images?.length) {
    const { error } = await supabase
      .from("product_images")
      .insert(images.map((img) => ({ ...img, product_id: inserted.id })));
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/panel-admin/products");
}

async function removeProduct(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/panel-admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

export default async function AdminProductsListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = toStringParam(params.q).trim();
  const status = toStringParam(params.status) || "all";
  const stock = toStringParam(params.stock) || "all";
  const category = toStringParam(params.category) || "all";
  const sort = toStringParam(params.sort) || "created_desc";
  const page = toIntParam(toStringParam(params.page), 1);

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseAdminClient();

  const { data: categoriesRow } = await supabase.from("site_content").select("value").eq("key", "categories").maybeSingle();
  const categories = (categoriesRow?.value as string[] | null) ?? [];

  let query = supabase
    .from("products")
    .select(
      "id, name, price, stock, is_active, created_at, slug, category, product_images(image_path, is_primary, sort_order)",
      { count: "exact" }
    );

  if (q) query = query.ilike("name", `%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  if (stock === "in") query = query.gt("stock", 0);
  if (stock === "out") query = query.eq("stock", 0);
  if (category !== "all") query = query.eq("category", category);

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else if (sort === "stock_asc") query = query.order("stock", { ascending: true });
  else if (sort === "stock_desc") query = query.order("stock", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: rows, count } = await query.range(from, to);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const products = (rows ?? []) as Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    is_active: boolean;
    created_at: string;
    slug: string | null;
    category: string | null;
    product_images?: Array<{ image_path: string | null; is_primary: boolean; sort_order: number }>;
  }>;

  const withImages = await Promise.all(
    products.map(async (p) => {
      const images = p.product_images ?? [];
      const best =
        images.find((img) => img.is_primary && img.image_path) ??
        images
          .filter((img) => !!img.image_path)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

      const imageUrl = best?.image_path ? await createSignedProductImageUrl(best.image_path).catch(() => null) : null;

      return {
        ...p,
        imageUrl,
      };
    })
  );

  const pagerParams = (nextPage: number) =>
    new URLSearchParams({
      ...(q ? { q } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(stock !== "all" ? { stock } : {}),
      ...(category !== "all" ? { category } : {}),
      ...(sort !== "created_desc" ? { sort } : {}),
      page: String(nextPage),
    }).toString();

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Productos</h1>
          <p className="text-slate-600 dark:text-slate-300">Buscar, filtrar y administrar el catálogo.</p>
        </div>
        <Link href="/admin/panel-admin/products/new" className="btn-primary w-full sm:w-auto">
          Crear producto
        </Link>
      </div>

      <ListFilters
        searchPlaceholder="Buscar producto por nombre..."
        filters={[
          {
            label: "Estado",
            param: "status",
            options: [
              { label: "Todos", value: "all" },
              { label: "Activo", value: "active" },
              { label: "Inactivo", value: "inactive" },
            ],
          },
          {
            label: "Stock",
            param: "stock",
            options: [
              { label: "Todos", value: "all" },
              { label: "Con stock", value: "in" },
              { label: "Sin stock", value: "out" },
            ],
          },
          {
            label: "Categoría",
            param: "category",
            options: [{ label: "Todas", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))],
          },
          {
            label: "Orden",
            param: "sort",
            options: [
              { label: "Fecha (desc)", value: "created_desc" },
              { label: "Precio (asc)", value: "price_asc" },
              { label: "Precio (desc)", value: "price_desc" },
              { label: "Stock (asc)", value: "stock_asc" },
              { label: "Stock (desc)", value: "stock_desc" },
            ],
          },
        ]}
      />

      <form action={bulkSetActive} className="space-y-4">
        <div className="card-base flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Acciones masivas</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Seleccioná productos y aplicá una acción.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="submit" name="action" value="activate">
              Activar seleccionados
            </button>
            <button className="btn-secondary" type="submit" name="action" value="deactivate">
              Desactivar seleccionados
            </button>
          </div>
        </div>

        <div className="card-base overflow-x-auto">
          {!withImages.length ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No hay productos para mostrar.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-4">
                    <span className="sr-only">Seleccionar</span>
                  </th>
                  <th className="py-2 pr-4">Producto</th>
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Precio</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {withImages.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4">
                      <input
                        type="checkbox"
                        name="ids"
                        value={p.id}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        aria-label={`Seleccionar ${p.name}`}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-50">{p.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{p.category ?? "Sin categoría"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-700 dark:text-slate-300">{p.slug ?? "-"}</td>
                    <td className="py-3 pr-4">{money(Number(p.price ?? 0))}</td>
                    <td className="py-3 pr-4">{p.stock}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={p.is_active ? "success" : "neutral"}>{p.is_active ? "Activo" : "Inactivo"}</StatusBadge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Link className="btn-secondary px-3 py-2" href={`/admin/panel-admin/products/${p.id}`}>
                          Editar
                        </Link>

                        <button className="btn-secondary px-3 py-2" type="submit" formAction={duplicateProduct} name="id" value={p.id}>
                          Duplicar
                        </button>

                        <ConfirmSubmit
                          className="btn-secondary px-3 py-2"
                          confirmMessage="¿Eliminar este producto? Esta acción no se puede deshacer."
                          formAction={removeProduct}
                          name="id"
                          value={p.id}
                        >
                          Eliminar
                        </ConfirmSubmit>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Página {page} de {totalPages} · {total} productos
        </p>

        <div className="flex gap-2">
          <Link
            className={`btn-secondary px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            href={`?${pagerParams(Math.max(1, page - 1))}`}
          >
            Anterior
          </Link>
          <Link
            className={`btn-secondary px-3 py-2 ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            href={`?${pagerParams(Math.min(totalPages, page + 1))}`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </section>
  );
}
