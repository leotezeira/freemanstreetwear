import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSiteMetrics } from "@/lib/services/metrics.service";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

export default async function AdminPanelHomePage() {
  const supabase = getSupabaseAdminClient();
  const today = startOfToday();
  const month = startOfMonth();

  const [{ data: orders }, { data: products }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total_amount, payment_status, created_at, customer_name")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("products")
      .select("id, name, stock, is_active")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const salesToday = (orders ?? [])
    .filter((o) => (o.created_at ? new Date(o.created_at) >= today : false))
    .reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);

  const salesMonth = (orders ?? [])
    .filter((o) => (o.created_at ? new Date(o.created_at) >= month : false))
    .reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);

  const totalIncome = (orders ?? []).reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);
  const ticketAvg = (orders ?? []).length ? totalIncome / (orders ?? []).length : 0;

  const pendingOrders = (orders ?? []).filter((o) => String(o.payment_status ?? "").toLowerCase() !== "approved").length;
  const lowStock = (products ?? []).filter((p) => Number(p.stock ?? 0) <= 5 && Boolean(p.is_active)).slice(0, 5);

  const metrics = await getSiteMetrics();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-300">Resumen rápido del ecommerce.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card-base">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ventas hoy</p>
          <p className="mt-2 text-2xl font-black">{money(salesToday)}</p>
        </div>
        <div className="card-base">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ventas mes</p>
          <p className="mt-2 text-2xl font-black">{money(salesMonth)}</p>
        </div>
        <div className="card-base">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ingresos (últimas 20)</p>
          <p className="mt-2 text-2xl font-black">{money(totalIncome)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ticket promedio: {money(ticketAvg)}</p>
        </div>
        <div className="card-base">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pedidos pendientes</p>
          <p className={pendingOrders ? "mt-2 text-2xl font-black text-red-600 dark:text-red-400" : "mt-2 text-2xl font-black"}>
            {pendingOrders}
          </p>
        </div>
        <div className="card-base">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Visitas web</p>
          <p className="mt-2 text-2xl font-black">{metrics.pageViews.toLocaleString("es-AR")}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="card-base">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Últimos pedidos</h2>
            <Link className="btn-secondary px-3 py-2" href="/admin/panel-admin/orders">
              Ver todos
            </Link>
          </div>

          {!orders?.length ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Todavía no hay pedidos.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(orders ?? []).map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-50">{o.customer_name}</td>
                      <td className="py-3 pr-4">{o.created_at ? new Date(o.created_at).toLocaleString("es-AR") : "-"}</td>
                      <td className="py-3 pr-4">{money(Number(o.total_amount ?? 0))}</td>
                      <td className="py-3 pr-4">{String(o.payment_status ?? "-")}</td>
                      <td className="py-3 pr-4">
                        <Link className="btn-secondary px-3 py-2" href={`/admin/panel-admin/orders/${o.id}`}>
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card-base">
            <h2 className="text-lg font-bold">Alertas</h2>
            {!lowStock.length ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Sin alertas por ahora.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {lowStock.map((p) => (
                  <div key={p.id} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/60 dark:bg-red-950/30">
                    <p className="font-semibold text-red-700 dark:text-red-300">Stock bajo</p>
                    <p className="mt-1 text-red-700 dark:text-red-300">{p.name}</p>
                    <p className="text-xs text-red-700/80 dark:text-red-300/80">Stock: {p.stock}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-base">
            <h2 className="text-lg font-bold">Accesos rápidos</h2>
            <div className="mt-3 grid gap-2">
              <Link className="btn-secondary" href="/admin/panel-admin/products">
                Administrar productos
              </Link>
              <Link className="btn-secondary" href="/admin/panel-admin/content">
                Editar contenido
              </Link>
              <Link className="btn-secondary" href="/admin/panel-admin/settings">
                Configuración
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
