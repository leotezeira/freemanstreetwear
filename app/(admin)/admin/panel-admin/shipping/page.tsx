import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function saveShipping(formData: FormData) {
  "use server";

  const flatRate = Number(formData.get("flatRate") ?? 0);
  const freeFrom = Number(formData.get("freeFrom") ?? 0);

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("site_content")
    .upsert({ key: "shipping_settings", value: { flatRate, freeFrom } }, { onConflict: "key" });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/panel-admin/shipping");
  revalidatePath("/checkout");
}

export default async function AdminShippingPage() {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("site_content").select("value").eq("key", "shipping_settings").maybeSingle();
  const settings = (data?.value as { flatRate?: number; freeFrom?: number } | null) ?? {};

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Envíos</h1>
        <p className="text-slate-600 dark:text-slate-300">Configuración simple (tarifa fija y envío gratis).</p>
      </div>

      <form action={saveShipping} className="card-base grid gap-3 md:max-w-xl">
        <label className="text-sm font-semibold">Costo fijo (ARS)</label>
        <input name="flatRate" type="number" min={0} step="1" className="input-base" defaultValue={settings.flatRate ?? 0} />

        <label className="text-sm font-semibold">Envío gratis desde (ARS)</label>
        <input name="freeFrom" type="number" min={0} step="1" className="input-base" defaultValue={settings.freeFrom ?? 0} />

        <button className="btn-primary w-full sm:w-auto" type="submit">
          Guardar
        </button>
      </form>
    </section>
  );
}
