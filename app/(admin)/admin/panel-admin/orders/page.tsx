import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ListFilters } from "@/components/admin/list-filters";
import { StatusBadge } from "@/components/admin/status-badge";

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

function badgeForStatus(status: string) {
  const s = status.toLowerCase();
  if (s === "approved") return { tone: "success" as const, label: "Aprobado" };
  if (s === "pending") return { tone: "warning" as const, label: "Pendiente" };
  if (s === "rejected") return { tone: "danger" as const, label: "Rechazado" };
  return { tone: "neutral" as const, label: status || "-" };
}

export default async function AdminOrdersListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = toStringParam(params.q).trim();
  const status = toStringParam(params.status) || "all";
  const sort = toStringParam(params.sort) || "created_desc";
  const page = toIntParam(toStringParam(params.page), 1);

  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("orders")
    .select("id, customer_name, customer_email, total_amount, payment_status, payment_provider, created_at", {
      count: "exact",
    });

  if (q) {
    const safe = q.replaceAll(",", " ");
    query = query.or(`customer_email.ilike.%${safe}%,customer_name.ilike.%${safe}%,id.eq.${safe}`);
  }

  if (status !== "all") {
    query = query.eq("payment_status", status);
  }

  if (sort === "total_desc") query = query.order("total_amount", { ascending: false });
  else if (sort === "total_asc") query = query.order("total_amount", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data: orders, count } = await query.range(from, to);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pagerParams = (nextPage: number) =>
    new URLSearchParams({
      ...(q ? { q } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(sort !== "created_desc" ? { sort } : {}),
      page: String(nextPage),
    }).toString();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Pedidos</h1>
        <p className="text-slate-600 dark:text-slate-300">Filtrá por estado y buscá por cliente/email o ID.</p>
      </div>

      <ListFilters
        searchPlaceholder="Buscar por email, cliente o ID..."
        filters={[
          {
            label: "Estado",
            param: "status",
            options: [
              { label: "Todos", value: "all" },
              { label: "Pendiente", value: "pending" },
              { label: "Aprobado", value: "approved" },
              { label: "Rechazado", value: "rejected" },
            ],
          },
          {
            label: "Orden",
            param: "sort",
            options: [
              { label: "Fecha (desc)", value: "created_desc" },
              { label: "Total (desc)", value: "total_desc" },
              { label: "Total (asc)", value: "total_asc" },
            ],
          },
        ]}
      />

      <div className="card-base overflow-x-auto">
        {!orders?.length ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Todavía no hay pedidos.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4">Orden</th>
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Pago</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {orders.map((o) => {
                const badge = badgeForStatus(String(o.payment_status ?? ""));
                return (
                  <tr key={o.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-700 dark:text-slate-300">{String(o.id).slice(0, 8)}</td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{o.customer_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{o.customer_email}</p>
                    </td>
                    <td className="py-3 pr-4">{o.created_at ? new Date(o.created_at).toLocaleString("es-AR") : "-"}</td>
                    <td className="py-3 pr-4">{money(Number(o.total_amount ?? 0))}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{o.payment_provider ?? "-"}</td>
                    <td className="py-3 pr-4">
                      <Link className="btn-secondary px-3 py-2" href={`/admin/panel-admin/orders/${o.id}`}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Página {page} de {totalPages} · {total} pedidos
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
