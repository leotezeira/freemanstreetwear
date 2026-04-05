import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getTransferDiscountPercent,
  setTransferDiscountPercent,
} from "@/lib/services/payment-settings.service";

type PaymentMethod = {
  id: string;
  label: string;
  enabled: boolean;
  type: "gateway" | "manual";
  instructions?: string;
};

async function savePaymentMethods(formData: FormData) {
  "use server";

  const supabase = getSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "payment_methods")
    .maybeSingle();

  const current = (existing?.value as PaymentMethod[]) ?? [];

  const updated = current.map((method) => ({
    ...method,
    enabled: formData.get(`enabled_${method.id}`) === "on",
    instructions: method.type === "manual"
      ? String(formData.get(`instructions_${method.id}`) ?? method.instructions ?? "")
      : method.instructions,
  }));

  const { error } = await supabase
    .from("site_content")
    .upsert({ key: "payment_methods", value: updated }, { onConflict: "key" });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/panel-admin/payments");
  revalidatePath("/checkout");
}

async function updateTransferDiscount(formData: FormData) {
  "use server";

  const raw = formData.get("transferDiscountPercent");
  const parsed = typeof raw === "string" ? Number(raw) : Number(raw ?? 0);
  const percent = Number.isFinite(parsed) ? parsed : 0;

  await setTransferDiscountPercent(percent);

  revalidatePath("/admin/panel-admin/payments");
  revalidatePath("/");
  revalidatePath("/shop");
}

export default async function AdminPaymentsPage() {
  const supabase = getSupabaseAdminClient();
  const hasMpToken = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "payment_methods")
    .maybeSingle();

  const methods = (data?.value as PaymentMethod[]) ?? [];
  const transferDiscountPercent = await getTransferDiscountPercent();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Pagos</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Activá o desactivá métodos de pago disponibles en el checkout.
        </p>
      </div>

      {/* Estado MercadoPago */}
      <div className="card-base space-y-2">
        <h2 className="text-base font-bold">Estado de integraciones</h2>
        <p className="text-sm">
          MercadoPago:{" "}
          {hasMpToken ? (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Conectado</span>
          ) : (
            <span className="font-semibold text-red-600 dark:text-red-400">
              Falta MERCADOPAGO_ACCESS_TOKEN
            </span>
          )}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Webhook: <span className="font-mono">/api/webhooks/mercadopago</span>
        </p>
      </div>

      {/* Métodos de pago */}
      <form action={updateTransferDiscount} className="card-base space-y-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Transferencia bancaria</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ofrecer descuento
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ajustá el porcentaje que se muestra automáticamente como precio con transferencia.
          </p>
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Descuento (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            name="transferDiscountPercent"
            defaultValue={transferDiscountPercent ?? 0}
            className="input-base max-w-[140px]"
          />
        </div>
        <button className="btn-primary w-full sm:w-auto" type="submit">
          Guardar descuento
        </button>
      </form>

      {methods.length === 0 ? (
        <div className="card-base">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No hay métodos configurados. Ejecutá el SQL de inicialización.
          </p>
        </div>
      ) : (
        <form action={savePaymentMethods} className="space-y-4">
          {methods.map((method) => (
            <div key={method.id} className="card-base space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">{method.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {method.type === "gateway" ? "Pasarela de pago" : "Pago manual"}
                    {method.id === "mercadopago" && !hasMpToken && (
                      <span className="ml-2 text-red-500">
                        (requiere MERCADOPAGO_ACCESS_TOKEN)
                      </span>
                    )}
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {method.enabled ? "Activo" : "Inactivo"}
                  </span>
                  <input
                    type="checkbox"
                    name={`enabled_${method.id}`}
                    defaultChecked={method.enabled}
                    className="h-4 w-4 rounded"
                  />
                </label>
              </div>

              {method.type === "manual" && (
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Instrucciones para el cliente
                  </label>
                  <textarea
                    name={`instructions_${method.id}`}
                    defaultValue={method.instructions ?? ""}
                    rows={3}
                    className="input-base text-sm"
                    placeholder="Ej: Alias, CBU, instrucciones de entrega..."
                  />
                </div>
              )}
            </div>
          ))}

          <button className="btn-primary w-full sm:w-auto" type="submit">
            Guardar métodos de pago
          </button>
        </form>
      )}
    </section>
  );
}
