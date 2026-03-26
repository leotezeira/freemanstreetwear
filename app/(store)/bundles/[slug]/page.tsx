"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { CheckCircle2, LoaderCircle, Package2 } from "lucide-react";

type BundleProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  is_active: boolean;
  stock: number;
};

type BundleVariant = {
  id: string;
  size: string;
  color: string;
  stock: number;
  price: number | null;
};

type BundleItem = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  products: BundleProduct | null;
  product_variants: BundleVariant | null;
};

type Bundle = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  image_path: string | null;
  bundle_items: BundleItem[];
};

export default function BundleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const slug = params.slug as string;

  useEffect(() => {
    void loadBundle();
  }, [slug]);

  async function loadBundle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bundles/${encodeURIComponent(slug)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar");
      setBundle(body.bundle);
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo cargar el bundle",
      });
      router.push("/bundles");
    } finally {
      setLoading(false);
    }
  }

  function handleVariantChange(itemId: string, variantId: string) {
    setSelectedVariants((prev) => ({
      ...prev,
      [itemId]: variantId === "any" ? "" : variantId,
    }));
  }

  async function handleAddToCart() {
    if (!bundle) return;

    // Verificar que todas las variantes requeridas estén seleccionadas
    const itemsWithoutVariant = bundle.bundle_items.filter(
      (item) => item.variant_id === null && !selectedVariants[item.id]
    );

    if (itemsWithoutVariant.length > 0) {
      toast.push({
        variant: "error",
        title: "Seleccioná variantes",
        description: "Tenés que elegir talle y color para algunos productos",
      });
      return;
    }

    setAdding(true);
    try {
      // Calcular precio total de los items para prorratear
      const totalItemsPrice = bundle.bundle_items.reduce((sum, item) => {
        const itemPrice = item.product_variants?.price ?? item.products?.price ?? 0;
        return sum + itemPrice * item.quantity;
      }, 0);

      // Agregar cada producto del bundle al carrito
      for (const item of bundle.bundle_items) {
        const itemPrice = item.product_variants?.price ?? item.products?.price ?? 0;
        const proratedPrice = bundle.price * (itemPrice / totalItemsPrice);

        const variantId = selectedVariants[item.id] || item.variant_id || undefined;

        addToCart({
          productId: item.product_id,
          variantId,
          name: `${item.products?.name ?? "Producto"} (Bundle: ${bundle.name})`,
          unitPrice: proratedPrice,
          quantity: item.quantity,
          imageUrl: null,
          stock: item.products?.stock ?? 0,
          isActive: item.products?.is_active ?? false,
        });
      }

      toast.push({
        variant: "success",
        title: "Agregado",
        description: "El bundle fue agregado al carrito",
      });

      router.push("/cart");
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: "No se pudo agregar el bundle al carrito",
      });
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <main className="app-container py-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="app-container py-10 text-center">
        <p className="text-slate-600 dark:text-slate-300">Bundle no encontrado</p>
      </main>
    );
  }

  const savings = bundle.compare_at_price
    ? bundle.compare_at_price - bundle.price
    : 0;

  return (
    <main className="app-container py-10">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Volver
        </button>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Imagen */}
          <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
            {bundle.image_path ? (
              <img
                src={bundle.image_path}
                alt={bundle.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Icon icon={Package2} className="h-16 w-16" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                {bundle.name}
              </h1>
              {bundle.description && (
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {bundle.description}
                </p>
              )}
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {formatMoney(bundle.price)}
                </span>
                {bundle.compare_at_price && (
                  <span className="text-lg line-through text-slate-400">
                    {formatMoney(bundle.compare_at_price)}
                  </span>
                )}
              </div>
              {savings > 0 && (
                <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  <Icon icon={CheckCircle2} className="mr-1 h-4 w-4" />
                  Ahorrás {formatMoney(savings)}
                </div>
              )}
            </div>

            {/* Productos incluidos */}
            <div className="space-y-3">
              <h2 className="text-base font-bold">Productos incluidos:</h2>
              {bundle.bundle_items.map((item) => {
                const product = item.products;
                const variant = item.product_variants;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
                      <Icon icon={Package2} className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {product?.name ?? "Producto"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cantidad: {item.quantity}
                      </p>
                      {variant && (
                        <p className="text-xs text-slate-500">
                          Talle: {variant.size} · Color: {variant.color}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selectores de variante */}
            {bundle.bundle_items.some((item) => item.variant_id === null) && (
              <div className="space-y-3">
                <h2 className="text-base font-bold">Seleccioná variantes:</h2>
                {bundle.bundle_items
                  .filter((item) => item.variant_id === null)
                  .map((item) => (
                    <div key={item.id} className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {item.products?.name}
                      </label>
                      <select
                        className="input-base"
                        value={selectedVariants[item.id] ?? ""}
                        onChange={(e) => handleVariantChange(item.id, e.target.value)}
                        required
                      >
                        <option value="">Elegí una opción...</option>
                        {/* Aquí irían las variantes disponibles del producto */}
                        <option value="any">Cualquiera (lo elegimos nosotros)</option>
                      </select>
                    </div>
                  ))}
              </div>
            )}

            {/* Botón */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding}
              className="btn-primary w-full"
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon={LoaderCircle} className="h-4 w-4 animate-spin" />
                  Agregando...
                </span>
              ) : (
                "Agregar Bundle al Carrito"
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}
