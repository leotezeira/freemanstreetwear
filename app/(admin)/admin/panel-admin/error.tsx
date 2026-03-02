"use client";

export default function AdminPanelError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="card-base space-y-3">
      <h1 className="text-lg font-black tracking-tight">Ocurrió un error</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">{error.message || "No se pudo cargar esta sección."}</p>
      <button className="btn-primary w-full sm:w-auto" type="button" onClick={() => reset()}>
        Reintentar
      </button>
    </section>
  );
}
