import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminVariantsPage() {
  const supabase = getSupabaseAdminClient();
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, size, color, sku, stock, price")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Variantes</h1>
        <p className="text-slate-600 dark:text-slate-300">Lista rápida de variantes (talle/color) y stock.</p>
      </div>

      {!variants?.length ? (
        <div className="card-base">
          <p className="text-sm text-slate-600 dark:text-slate-300">Todavía no hay variantes creadas.</p>
        </div>
      ) : (
        <div className="card-base overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Talle</th>
                <th className="py-2 pr-4">Color</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {variants.map((v) => (
                <tr key={v.id}>
                  <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-50">{v.sku ?? "-"}</td>
                  <td className="py-3 pr-4">{v.size}</td>
                  <td className="py-3 pr-4">{v.color}</td>
                  <td className="py-3 pr-4">{v.stock}</td>
                  <td className="py-3 pr-4">{v.price != null ? `$${Number(v.price).toLocaleString("es-AR")}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
