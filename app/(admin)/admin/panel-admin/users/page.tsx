import { getAllAppUsers } from "@/lib/services/app-users.service";

function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("es-AR");
}

export default async function AdminUsersPage() {
  const users = await getAllAppUsers();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Usuarios Registrados</h1>
        <p className="text-slate-600 dark:text-slate-300">Listado de usuarios que se registraron en tu plataforma.</p>
      </div>

      <div className="card-base">
        {users.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-300">No hay usuarios registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Registrado</th>
                  <th className="py-3 px-4">Último acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-50">{user.email}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatDate(user.created_at)}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatDate(user.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Total: <span className="font-semibold">{users.length}</span> usuario{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
