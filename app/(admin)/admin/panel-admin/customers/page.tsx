import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type CustomerRow = {
  email: string;
  name: string;
  totalSpent: number;
  orderCount: number;
  lastOrderAt: string;
};

export default async function AdminCustomersPage() {
  const supabase = getSupabaseAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("customer_email, customer_name, total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const byEmail = new Map<string, CustomerRow>();
  for (const o of orders ?? []) {
    const email = String(o.customer_email ?? "").trim().toLowerCase();
    if (!email) continue;
    const existing = byEmail.get(email);

    const next: CustomerRow = {
      email,
      name: String(o.customer_name ?? "") || existing?.name || email,
      totalSpent: (existing?.totalSpent ?? 0) + Number(o.total_amount ?? 0),
      orderCount: (existing?.orderCount ?? 0) + 1,
      lastOrderAt: existing?.lastOrderAt ?? String(o.created_at ?? ""),
    };

    byEmail.set(email, next);
  }

  const customers = Array.from(byEmail.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Clientes</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Vista básica derivada de órdenes (sin tabla propia de clientes).
        </p>
      </div>

      {!customers.length ? (
        <div className="card-base">
          <p className="text-sm text-slate-600 dark:text-slate-300">Todavía no hay clientes (no hay órdenes).</p>
        </div>
      ) : (
        <div className="card-base overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Pedidos</th>
                <th className="py-2 pr-4">Total gastado</th>
                <th className="py-2 pr-4">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {customers.map((c) => (
                <tr key={c.email}>
                  <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-50">{c.email}</td>
                  <td className="py-3 pr-4">{c.name}</td>
                  <td className="py-3 pr-4">{c.orderCount}</td>
                  <td className="py-3 pr-4">${Number(c.totalSpent).toLocaleString("es-AR")}</td>
                  <td className="py-3 pr-4">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleString("es-AR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
