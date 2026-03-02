export default function AdminMarketingPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Marketing</h1>
        <p className="text-slate-600 dark:text-slate-300">Banners / popups / automatizaciones (pendiente).</p>
      </div>

      <div className="card-base space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Por ahora, el contenido editable está en la sección <span className="font-semibold">Contenido</span>.
        </p>
        <a className="btn-secondary w-full sm:w-auto" href="/admin/panel-admin/content">
          Ir a Contenido
        </a>
      </div>
    </section>
  );
}
