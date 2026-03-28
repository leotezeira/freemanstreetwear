"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { CheckCircle2, LoaderCircle, Package2, Image as ImageIcon } from "lucide-react";

type BundleProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  stock: number;
  image_path: string | null;
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

type ProductVariants = Record<string, BundleVariant[]>;

export default function BundleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [productVariants, setProductVariants] = useState<ProductVariants>({});
  const [loadingVariants, setLoadingVariants] = useState<Record<string, boolean>>({});

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

      // Cargar variantes para los productos que las necesiten
      const itemsWithoutVariant = body.bundle?.bundle_items?.filter(
        (item: BundleItem) => item.variant_id === null && item.products
      ) ?? [];

      for (const item of itemsWithoutVariant) {
        void loadProductVariants(item.products!.id);
      }
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

  async function loadProductVariants(productId: string) {
    if (productVariants[productId] || loadingVariants[productId]) return;

    setLoadingVariants((prev) => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`/api/bundles/${slug}/variants/${productId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar variantes");
      setProductVariants((prev) => ({ ...prev, [productId]: body.variants ?? [] }));
    } catch (e) {
      console.error("[loadProductVariants]", e);
    } finally {
      setLoadingVariants((prev) => ({ ...prev, [productId]: false }));
    }
  }

  function handleVariantSelect(itemId: string, productId: string, variantId: string) {
    setSelectedVariants((prev) => ({
      ...prev,
      [itemId]: variantId,
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
          imageUrl: item.products?.image_path ?? null,
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
            <div className="space-y-4">
              <h2 className="text-base font-bold">Productos incluidos:</h2>
              {bundle.bundle_items.map((item) => {
                const product = item.products;
                const variant = item.product_variants;
                const variants = productVariants[product?.id ?? ""] ?? [];
                const needsVariant = item.variant_id === null;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-start gap-3">
                      {/* Imagen del producto */}
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                        {product?.image_path ? (
                          <img
                            src={product.image_path}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Icon icon={ImageIcon} className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Info del producto */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {product?.name ?? "Producto"}
                        </p>
                        <p className="text-sm text-slate-500">
                          Cantidad: {item.quantity}
                        </p>
                        {variant && (
                          <p className="text-xs text-slate-500">
                            Talle: {variant.size} · Color: {variant.color}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Selector de variantes (si es necesario) */}
                    {needsVariant && product && (
                      <div className="mt-3">
                        {loadingVariants[product.id] ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Icon icon={LoaderCircle} className="h-4 w-4 animate-spin" />
                            Cargando variantes...
                          </div>
                        ) : variants.length > 0 ? (
                          <div className="space-y-2">
                            {/* Agrupar variantes por tipo (size/color) */}
                            {(() => {
                              const sizes = Array.from(
                                new Set(variants.map((v) => v.size))
                              ).filter(Boolean);
                              const colors = Array.from(
                                new Set(variants.map((v) => v.color))
                              ).filter(Boolean);

                              return (
                                <>
                                  {/* Fila de talles */}
                                  {sizes.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Talle:
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {sizes.map((size) => {
                                          const sizeVariants = variants.filter(
                                            (v) => v.size === size && v.stock > 0
                                          );
                                          const isSelected = selectedVariants[item.id] &&
                                            sizeVariants.some(
                                              (v) => v.id === selectedVariants[item.id]
                                            );

                                          return (
                                            <button
                                              key={size}
                                              type="button"
                                              onClick={() => {
                                                if (sizeVariants.length === 1) {
                                                  handleVariantSelect(
                                                    item.id,
                                                    product.id,
                                                    sizeVariants[0].id
                                                  );
                                                }
                                              }}
                                              disabled={sizeVariants.length === 0}
                                              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                                                isSelected
                                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                  : sizeVariants.length > 0
                                                  ? "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                                                  : "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900"
                                              }`}
                                            >
                                              {size}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Fila de colores */}
                                  {colors.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Color:
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {colors.map((color) => {
                                          const colorVariants = variants.filter(
                                            (v) => v.color === color && v.stock > 0
                                          );
                                          const isSelected = selectedVariants[item.id] &&
                                            colorVariants.some(
                                              (v) => v.id === selectedVariants[item.id]
                                            );

                                          return (
                                            <button
                                              key={color}
                                              type="button"
                                              onClick={() => {
                                                if (colorVariants.length === 1) {
                                                  handleVariantSelect(
                                                    item.id,
                                                    product.id,
                                                    colorVariants[0].id
                                                  );
                                                }
                                              }}
                                              disabled={colorVariants.length === 0}
                                              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                                                isSelected
                                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                  : colorVariants.length > 0
                                                  ? "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                                                  : "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900"
                                              }`}
                                            >
                                              {color}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Selector completo si hay combinaciones */}
                                  {sizes.length > 1 && colors.length > 1 && (
                                    <div className="mt-2">
                                      <select
                                        className="input-base text-sm"
                                        value={selectedVariants[item.id] ?? ""}
                                        onChange={(e) =>
                                          handleVariantSelect(item.id, product.id, e.target.value)
                                        }
                                      >
                                        <option value="">Seleccioná una combinación...</option>
                                        {variants
                                          .filter((v) => v.stock > 0)
                                          .map((v) => (
                                            <option key={v.id} value={v.id}>
                                              {v.size} / {v.color} {v.stock <= 0 ? "(Sin stock)" : ""}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Sin variantes disponibles</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

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
