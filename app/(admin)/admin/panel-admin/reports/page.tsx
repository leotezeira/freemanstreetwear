import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default async function AdminReportsPage() {
  const supabase = getSupabaseAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const now = new Date();
  const days = 7;
  const buckets = Array.from({ length: days }, (_, i) => {
    const day = startOfDay(new Date(now.getTime() - (days - 1 - i) * 86400000));
    const key = day.toISOString().slice(0, 10);
    return { key, amount: 0 };
  });

  const indexByKey = new Map(buckets.map((b, idx) => [b.key, idx] as const));
  for (const o of orders ?? []) {
    const key = String(o.created_at ?? "").slice(0, 10);
    const idx = indexByKey.get(key);
    if (idx == null) continue;
    buckets[idx].amount += Number(o.total_amount ?? 0);
  }

  const max = Math.max(1, ...buckets.map((b) => b.amount));

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Reportes</h1>
        <p className="text-slate-600 dark:text-slate-300">Ventas últimos 7 días (simple).</p>
      </div>

      <div className="card-base">
        {!orders?.length ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No hay datos todavía (sin órdenes).</p>
        ) : (
          <div className="grid gap-2">
            {buckets.map((b) => (
              <div key={b.key} className="grid grid-cols-[88px_1fr_90px] items-center gap-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">{b.key.slice(5)}</span>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-3 rounded-full bg-accent"
                    style={{ width: `${Math.round((b.amount / max) * 100)}%` }}
                  />
                </div>
                <span className="text-right font-semibold">${Math.round(b.amount).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
