"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { CheckCircle2, LoaderCircle, Package2, Plus, X } from "lucide-react";

type BundleProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  is_active: boolean;
  stock: number;
  product_images?: Array<{
    image_path: string | null;
    is_primary: boolean;
  }>;
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
  products: BundleProduct | null;
  product_variants: BundleVariant | null;
  _all_variants?: BundleVariant[];
};

type Bundle = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  image_path: string | null;
  required_quantity: number;
  bundle_items: BundleItem[];
};

type SelectedProduct = {
  itemId: string;
  productId: string;
  variantId: string | null;
};

export default function BundleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const slug = params.slug as string;

  // Helper para obtener imagen principal del producto
  function getProductImageUrl(product: BundleProduct | null): string | null {
    if (!product?.product_images?.length) return null;
    const primary = product.product_images.find(img => img.is_primary);
    return primary?.image_path ?? product.product_images[0]?.image_path ?? null;
  }

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

  function handleSelectProduct(itemId: string, productId: string) {
    // Verificar si ya está seleccionado
    const alreadySelected = selectedProducts.find((p) => p.itemId === itemId);
    if (alreadySelected) {
      // Deseleccionar
      setSelectedProducts((prev) => prev.filter((p) => p.itemId !== itemId));
      // Limpiar variante
      const newVariants = { ...selectedVariants };
      delete newVariants[itemId];
      setSelectedVariants(newVariants);
      return;
    }

    // Verificar si ya alcanzó el máximo
    if (selectedProducts.length >= (bundle?.required_quantity ?? 0)) {
      toast.push({
        variant: "error",
        title: "Máximo alcanzado",
        description: `Ya seleccionaste ${bundle?.required_quantity} productos`,
      });
      return;
    }

    // Agregar selección
    setSelectedProducts((prev) => [
      ...prev,
      { itemId, productId, variantId: null },
    ]);
  }

  function handleVariantChange(itemId: string, variantId: string) {
    setSelectedVariants((prev) => ({
      ...prev,
      [itemId]: variantId === "" ? "" : variantId,
    }));
  }

  async function handleAddToCart() {
    if (!bundle) return;

    // Verificar cantidad seleccionada
    if (selectedProducts.length !== bundle.required_quantity) {
      toast.push({
        variant: "error",
        title: "Seleccioná más productos",
        description: `Debés elegir exactamente ${bundle.required_quantity} productos`,
      });
      return;
    }

    // Verificar variantes seleccionadas
    const itemsWithoutVariant = selectedProducts.filter(
      (p) => !p.variantId && !selectedVariants[p.itemId]
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
      // Calcular precio prorrateado
      const pricePerProduct = bundle.price / bundle.required_quantity;

      // Agregar cada producto seleccionado al carrito
      for (const selected of selectedProducts) {
        const bundleItem = bundle.bundle_items.find((item) => item.id === selected.itemId);
        const product = bundleItem?.products;
        const variant = bundleItem?.product_variants;

        const variantId = selected.variantId || selectedVariants[selected.itemId] || undefined;

        addToCart({
          productId: selected.productId,
          variantId,
          name: `${product?.name ?? "Producto"} (Bundle: ${bundle.name})`,
          unitPrice: pricePerProduct,
          quantity: 1,
          imageUrl: getProductImageUrl(product ?? null),
          stock: product?.stock ?? 0,
          isActive: product?.is_active ?? false,
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

  const remainingSelections = bundle.required_quantity - selectedProducts.length;

  return (
    <main className="app-container py-10">
      <div className="mx-auto max-w-5xl">
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

            {/* Instrucciones de selección */}
            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Elegí {bundle.required_quantity} productos
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {remainingSelections > 0
                  ? `Te faltan ${remainingSelections} productos para completar el bundle`
                  : "¡Completaste la selección!"}
              </p>
            </div>

            {/* Productos seleccionados */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Productos seleccionados ({selectedProducts.length}/{bundle.required_quantity}):
                </h2>
                {selectedProducts.map((selected) => {
                  const bundleItem = bundle.bundle_items.find(
                    (item) => item.id === selected.itemId
                  );
                  const product = bundleItem?.products;
                  const variantId = selected.variantId || selectedVariants[selected.itemId];
                  const variant = bundleItem?.product_variants?.id === variantId
                    ? bundleItem.product_variants
                    : null;

                  return (
                    <div
                      key={selected.itemId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                          {product?.name ?? "Producto"}
                        </p>
                        {variant ? (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Talle: {variant.size} · Color: {variant.color}
                          </p>
                        ) : (
                          <select
                            className="mt-1 text-xs rounded border border-emerald-300 bg-white px-2 py-1 dark:border-emerald-800 dark:bg-slate-900"
                            value={selectedVariants[selected.itemId] ?? ""}
                            onChange={(e) => handleVariantChange(selected.itemId, e.target.value)}
                          >
                            <option value="">Elegí talle y color...</option>
                            {bundleItem?._all_variants?.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.size} · {v.color} {v.stock <= 0 ? "(Sin stock)" : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectProduct(selected.itemId, selected.productId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Icon icon={X} className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botón */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding || selectedProducts.length !== bundle.required_quantity}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon={LoaderCircle} className="h-4 w-4 animate-spin" />
                  Agregando...
                </span>
              ) : (
                `Agregar Bundle al Carrito - ${formatMoney(bundle.price)}`
              )}
            </button>
          </div>
        </div>

        {/* Pool de productos disponibles */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">
            Productos disponibles para elegir:
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bundle.bundle_items.map((item) => {
              const product = item.products;
              const isSelected = selectedProducts.some((p) => p.itemId === item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectProduct(item.id, item.product_id)}
                  disabled={isSelected}
                  className={`group text-left card-base space-y-3 transition hover:shadow-lg ${
                    isSelected
                      ? "opacity-50 cursor-default"
                      : remainingSelections <= 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                    {(() => {
                      const imgUrl = getProductImageUrl(product);
                      return imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Icon icon={Package2} className="h-12 w-12" />
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 group-hover:underline">
                      {product?.name ?? "Producto"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {product?.category ?? "Sin categoría"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                      {formatMoney(product?.price ?? 0)}
                    </span>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <Icon icon={CheckCircle2} className="h-4 w-4" />
                        Seleccionado
                      </span>
                    ) : (
                      <Icon icon={Plus} className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </div>
                </button>
              );
            })}
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
