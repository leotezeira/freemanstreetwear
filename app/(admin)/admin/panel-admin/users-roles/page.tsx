export default function AdminUsersRolesPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Usuarios y roles</h1>
        <p className="text-slate-600 dark:text-slate-300">Actualmente el admin usa Basic Auth (usuario/contraseña).</p>
      </div>

      <div className="card-base space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Con Basic Auth no hay roles por usuario. Si querés roles (Super admin/Admin/Editor/Operador), hay que volver a Supabase Auth
          y modelar permisos.
        </p>
      </div>
    </section>
  );
}
