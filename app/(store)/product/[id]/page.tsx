import { notFound } from "next/navigation";
import { getProductDetailById } from "@/lib/services/products.service";
import { ProductGallery } from "@/components/products/product-gallery";
import { sanitizeProductHtml } from "@/lib/utils/sanitize";
import { searchProductsByName } from "@/lib/services/products.service";
import { Icon } from "@/components/ui/icon";
import { RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import { ProductCard } from "@/components/products/product-card";
import { getTransferDiscountPercent } from "@/lib/services/payment-settings.service";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const detail = await getProductDetailById(id).catch(() => null);

  if (!detail || !detail.product.is_active) {
    notFound();
  }

  const transferDiscountPercent = await getTransferDiscountPercent();

  const { product, images, variants } = detail;
  const galleryImages = images
    .filter((img) => !!img.signed_url)
    .map((img) => ({ id: img.id, url: img.signed_url as string, isPrimary: img.is_primary }));

  const safeDescriptionHtml = sanitizeProductHtml(product.description);

  const price = Number(product.price);
  const compareAt = (product as any).compare_at_price !== null && (product as any).compare_at_price !== undefined ? Number((product as any).compare_at_price) : null;

  const related = await searchProductsByName({})
    .then((list) =>
      list
        .filter((p) => p.id !== product.id)
        .filter((p) => (product.category ? p.category === product.category : true))
        .slice(0, 4)
    )
    .catch(() => []);

  return (
    <main className="app-container py-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={galleryImages} alt={product.name} />

        <div className="space-y-5">
          {product.category ? <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{product.category}</p> : null}

          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{product.name}</h1>

          <div className="card-base space-y-4">
            <ProductDetailActions
              productId={product.id}
              productName={product.name}
              basePrice={price}
              compareAtPrice={compareAt}
              baseStock={product.stock}
              variants={variants}
              imageUrl={galleryImages[0]?.url ?? null}
              weight_grams={product.weight_grams ?? null}
              height={product.height ?? null}
              width={product.width ?? null}
              length={product.length ?? null}
            />

            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Icon icon={Truck} />
                <span>Envío rápido</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Icon icon={ShieldCheck} />
                <span>Pago seguro</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Icon icon={RefreshCcw} />
                <span>Cambios sin cargo</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <details open className="card-base">
              <summary className="cursor-pointer text-lg font-bold">Descripción</summary>
              <div className="prose prose-slate mt-3 max-w-none text-sm leading-6 dark:prose-invert" dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }} />
            </details>

            <details className="card-base">
              <summary className="cursor-pointer text-lg font-bold">Envíos</summary>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Los tiempos y costos de envío se calculan en el checkout.
              </p>
            </details>

            <details className="card-base">
              <summary className="cursor-pointer text-lg font-bold">Cambios y devoluciones</summary>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Si necesitás cambiar tu producto, escribinos desde la sección de contacto.
              </p>
            </details>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">Productos relacionados</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                transferDiscountPercent={transferDiscountPercent}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
