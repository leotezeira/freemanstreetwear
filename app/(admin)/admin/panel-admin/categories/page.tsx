import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function saveCategories(formData: FormData) {
  "use server";

  const input = String(formData.get("categories") ?? "");
  const categories = input
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("site_content")
    .upsert({ key: "categories", value: categories }, { onConflict: "key" });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/panel-admin/categories");
  revalidatePath("/admin/panel-admin/products");
}

export default async function AdminCategoriesPage() {
  const supabase = getSupabaseAdminClient();
  const { data: existing } = await supabase.from("site_content").select("value").eq("key", "categories").maybeSingle();
  const current = (existing?.value as string[] | null) ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Categorías</h1>
        <p className="text-slate-600 dark:text-slate-300">Lista de categorías para organización del catálogo.</p>
      </div>

      <form action={saveCategories} className="card-base grid gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Una por línea.</p>
        <textarea
          name="categories"
          defaultValue={current.join("\n")}
          className="input-base min-h-44"
          placeholder="Remeras\nBuzos\nAccesorios"
        />
        <button className="btn-primary w-full sm:w-auto" type="submit">
          Guardar categorías
        </button>
      </form>
    </section>
  );
}
