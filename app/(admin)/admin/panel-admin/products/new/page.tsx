import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { NewProductForm } from "@/components/admin/new-product-form";

export default async function AdminNewProductPage() {
  const supabase = getSupabaseAdminClient();
  const { data: categoriesRow } = await supabase.from("site_content").select("value").eq("key", "categories").maybeSingle();
  const categories = (categoriesRow?.value as string[] | null) ?? [];

  const { data: tagsRows } = await supabase.from("products").select("tags").limit(200);
  const tagSuggestions = Array.from(
    new Set(
      (tagsRows ?? [])
        .flatMap((r) => ((r as any)?.tags as string[] | null) ?? [])
        .map((t) => String(t).trim())
        .filter(Boolean)
    )
  ).slice(0, 200);

  return (
    <section>
      <NewProductForm categories={categories} tagSuggestions={tagSuggestions} />
    </section>
  );
}
