export default function AdminDiscountsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Descuentos</h1>
        <p className="text-slate-600 dark:text-slate-300">Módulo pendiente de integración en checkout.</p>
      </div>

      <div className="card-base space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Esta sección está creada para completar la estructura del admin.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Próximo paso: definir almacenamiento (tabla/`site_content`) y aplicar descuentos en `/checkout`.
        </p>
      </div>
    </section>
  );
}
