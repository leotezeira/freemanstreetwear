export default function AdminPaymentsPage() {
  const hasMpToken = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Pagos</h1>
        <p className="text-slate-600 dark:text-slate-300">Estado de integración y webhooks.</p>
      </div>

      <div className="card-base space-y-2">
        <p className="text-sm">
          MercadoPago: {hasMpToken ? (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Conectado</span>
          ) : (
            <span className="font-semibold text-red-600 dark:text-red-400">Falta MERCADOPAGO_ACCESS_TOKEN</span>
          )}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Webhook: <span className="font-mono">/api/webhooks/mercadopago</span>
        </p>
      </div>
    </section>
  );
}
