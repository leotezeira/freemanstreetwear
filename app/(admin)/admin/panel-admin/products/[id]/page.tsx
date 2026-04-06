import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSignedProductImageUrl } from "@/lib/services/product-images.service";
import { ProductImagesUploader } from "@/components/admin/product-images-uploader";
import { EditProductForm } from "@/components/admin/edit-product-form";
import { Icon } from "@/components/ui/icon";
import { Image as ImageIcon, Shapes } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

async function createVariant(formData: FormData) {
  "use server";

  const supabase = getSupabaseAdminClient();
  const productId = String(formData.get("productId") ?? "");
  const size = String(formData.get("size") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const stock = Number(formData.get("variantStock") ?? 0);

  const priceRaw = formData.get("variantPrice");
  const price = priceRaw !== null ? (Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null) : null;

  const { error } = await supabase
    .from("product_variants")
    .insert({ product_id: productId, size, color, sku, stock, price });
  if (error) throw new Error(error.message);
}

export default async function AdminEditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  const [{ data: product }, { data: variants }, { data: images }, { data: categoriesRow }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, description, price, compare_at_price, stock, is_active, is_featured, created_at, category, tags, weight_grams, height, width, length, slug, meta_title, meta_description"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("product_variants")
      .select("id, product_id, size, color, sku, stock, price, created_at")
      .eq("product_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("product_images")
      .select("id, product_id, image_path, is_primary, sort_order")
      .eq("product_id", id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),
    supabase.from("site_content").select("value").eq("key", "categories").maybeSingle(),
  ]);

  if (!product) notFound();
  const categories = (categoriesRow?.value as string[] | null) ?? [];

  const existingImages = await Promise.all(
    (images ?? []).map(async (img) => {
      const url = img.image_path ? await createSignedProductImageUrl(img.image_path).catch(() => null) : null;
      return { id: img.id, url, is_primary: Boolean(img.is_primary) };
    })
  );

  return (
    <section className="space-y-4">
      <div className="card-base space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon icon={ImageIcon} />
          <span>Imágenes</span>
        </h2>
        <ProductImagesUploader productId={product.id} existingImages={existingImages} />
      </div>

      <EditProductForm
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          compare_at_price: product.compare_at_price,
          stock: product.stock,
          category: product.category,
          tags: product.tags ?? [],
          weight_grams: product.weight_grams,
          height: product.height,
          width: product.width,
          length: product.length,
          meta_title: product.meta_title,
          meta_description: product.meta_description,
          is_active: product.is_active,
        }}
        categories={categories}
      />

      <div className="card-base space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon icon={Shapes} />
          <span>Variantes</span>
        </h2>

        <form action={createVariant} className="grid gap-2 md:grid-cols-6">
          <input type="hidden" name="productId" value={product.id} />
          <input name="size" className="input-base md:col-span-1" placeholder="Talle" required />
          <input name="color" className="input-base md:col-span-1" placeholder="Color" required />
          <input name="sku" className="input-base md:col-span-2" placeholder="SKU (opcional)" />
          <input name="variantStock" type="number" className="input-base md:col-span-1" placeholder="Stock" min={0} required />
          <input name="variantPrice" type="number" className="input-base md:col-span-1" placeholder="Precio (opcional)" min={0} />
          <button className="btn-secondary md:col-span-6" type="submit">
            Crear variante
          </button>
        </form>

        {(variants ?? []).length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Talle</th>
                  <th className="py-2 pr-4">Color</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(variants ?? []).map((v) => (
                  <tr key={v.id}>
                    <td className="py-3 pr-4 font-mono text-xs">{v.sku ?? "-"}</td>
                    <td className="py-3 pr-4">{v.size}</td>
                    <td className="py-3 pr-4">{v.color}</td>
                    <td className="py-3 pr-4">{v.stock}</td>
                    <td className="py-3 pr-4">{v.price != null ? `$${Number(v.price).toLocaleString("es-AR")}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">Sin variantes aún.</p>
        )}
      </div>
    </section>
  );
}
