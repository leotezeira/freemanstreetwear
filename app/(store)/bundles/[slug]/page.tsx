// =====================================================
// PÁGINA: /bundles/[slug]
// Detalle de bundle con selección de productos
// =====================================================

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { ClientImage } from "@/components/ui/client-image";
import { CheckCircle2, LoaderCircle, Package2, X, ChevronRight } from "lucide-react";
import type { BundleWithItems, ProductVariant } from "@/types/bundle";

type SelectedItem = {
  slotIndex: number;
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
  const [bundle, setBundle] = useState<BundleWithItems | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number | null>(null);
  const [showingVariantFor, setShowingVariantFor] = useState<{
    productId: string;
    slotIndex: number;
    variants: ProductVariant[];
    productName: string;
    productImage: string | null;
  } | null>(null);

  const slug = params.slug as string;

  // Helper para obtener imagen principal del producto
  function getProductImageUrl(product: BundleWithItems["bundle_items"][0]["products"]): string | null {
    // Primero intentar con la URL firmada
    if (product?.primary_image_url) return product.primary_image_url;
    if (product?.image_path) return product.image_path;
    // Fallback a product_images
    if (!product?.product_images?.length) return null;
    const primary = product.product_images.find(img => img.is_primary);
    return primary?.image_path ?? product.product_images[0]?.image_path ?? null;
  }

  useEffect(() => {
    void loadBundle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadBundle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bundles/${encodeURIComponent(slug)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar");
      setBundle(body.bundle);
    } catch (error) {
      toast.push({
        variant: "error",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar el bundle",
      });
      router.push("/bundles");
    } finally {
      setLoading(false);
    }
  }

  function openProductSelector(slotIndex: number) {
    setCurrentSlotIndex(slotIndex);
    setShowProductSelector(true);
  }

  function handleProductSelect(productId: string) {
    if (currentSlotIndex === null) return;

    const item = bundle?.bundle_items.find((i) => i.product_id === productId);
    const product = item?.products;

    if (!product) return;

    // Si el producto tiene variantes, mostrar selector
    if (item?._all_variants && item._all_variants.length > 0) {
      setShowProductSelector(false);
      setShowingVariantFor({
        productId,
        slotIndex: currentSlotIndex,
        variants: item._all_variants.filter(v => v.stock > 0),
        productName: product.name,
        productImage: getProductImageUrl(product),
      });
    } else {
      // Sin variantes, agregar directo
      setSelectedItems((prev) => {
        const existing = prev.findIndex((i) => i.slotIndex === currentSlotIndex);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { slotIndex: currentSlotIndex, productId, variantId: null };
          return updated;
        }
        return [...prev, { slotIndex: currentSlotIndex, productId, variantId: null }];
      });
      setShowProductSelector(false);
      setCurrentSlotIndex(null);
    }
  }

  function handleVariantSelect(productId: string, variantId: string) {
    if (!showingVariantFor) return;
    const { slotIndex } = showingVariantFor;

    setSelectedItems((prev) => {
      const existing = prev.findIndex((i) => i.slotIndex === slotIndex);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { slotIndex, productId, variantId };
        return updated;
      }
      return [...prev, { slotIndex, productId, variantId }];
    });

    setShowingVariantFor(null);
  }

  function removeSelectedItem(slotIndex: number) {
    setSelectedItems((prev) => prev.filter((i) => i.slotIndex !== slotIndex));
  }

  async function handleAddToCart() {
    if (!bundle) return;

    // Verificar cantidad
    if (selectedItems.length !== bundle.required_quantity) {
      toast.push({
        variant: "error",
        title: "Productos incompletos",
        description: `Debés elegir exactamente ${bundle.required_quantity} productos`,
      });
      return;
    }

    // Verificar variantes
    const itemsWithoutVariant = selectedItems.filter((item) => {
      const bundleItem = bundle.bundle_items.find((i) => i.product_id === item.productId);
      const hasVariants = bundleItem?._all_variants && bundleItem._all_variants.length > 0;
      return hasVariants && !item.variantId;
    });

    if (itemsWithoutVariant.length > 0) {
      toast.push({
        variant: "error",
        title: "Faltan variantes",
        description: "Debés seleccionar talle y color para todos los productos",
      });
      return;
    }

    setAdding(true);
    try {
      // Calcular precio prorrateado
      const totalItemsPrice = selectedItems.reduce((sum, item) => {
        const bundleItem = bundle.bundle_items.find((i) => i.product_id === item.productId);
        let itemPrice = bundleItem?.products?.price ?? 0;

        if (item.variantId) {
          const variant = bundleItem?.products?.product_variants?.find((v) => v.id === item.variantId);
          if (variant && variant.price !== null) {
            itemPrice = variant.price;
          }
        }

        return sum + itemPrice;
      }, 0);

      const bundleGroupId = crypto.randomUUID();

      for (const selectedItem of selectedItems) {
        const bundleItem = bundle.bundle_items.find((i) => i.product_id === selectedItem.productId);
        const product = bundleItem?.products;
        if (!product) continue;

        let itemPrice = product.price;
        let variantName = "";

        if (selectedItem.variantId) {
          const variants = bundleItem?.products?.product_variants ?? [];
          const variant = variants.find((v) => v.id === selectedItem.variantId);
          if (variant) {
            if (variant.price !== null) itemPrice = variant.price;
            variantName = `${variant.size} / ${variant.color}`;
          }
        }

        const proratedPrice = bundle.price * (itemPrice / totalItemsPrice);

        addToCart({
          productId: selectedItem.productId,
          variantId: selectedItem.variantId ?? undefined,
          name: variantName ? `${product.name} (${variantName})` : product.name,
          unitPrice: proratedPrice,
          quantity: 1,
          imageUrl: getProductImageUrl(product),
          stock: product.stock ?? 0,
          isActive: product.is_active ?? false,
          bundleId: bundle.id,
          bundleGroupId,
        });
      }

      toast.push({
        variant: "success",
        title: "Agregado",
        description: "El bundle fue agregado al carrito",
      });

      router.push("/cart");
    } catch {
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

  const savings = bundle.compare_at_price ? bundle.compare_at_price - bundle.price : 0;
  const selectedProductIds = new Set(selectedItems.map((i) => i.productId));

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
              <ClientImage
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
                <p className="mt-2 text-slate-600 dark:text-slate-300">{bundle.description}</p>
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

            {/* Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  Elegí {bundle.required_quantity} productos
                </h2>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {selectedItems.length} / {bundle.required_quantity} seleccionados
                </span>
              </div>

              <div className="space-y-3">
                {Array.from({ length: bundle.required_quantity }).map((_, index) => {
                  const selectedItem = selectedItems.find((i) => i.slotIndex === index);
                  const item = selectedItem
                    ? bundle.bundle_items.find((i) => i.product_id === selectedItem.productId)
                    : null;
                  const product = item?.products;
                  const variant = selectedItem?.variantId
                    ? product?.product_variants?.find((v) => v.id === selectedItem.variantId)
                    : null;

                  return (
                    <div
                      key={index}
                      className={`rounded-xl border-2 p-4 transition ${
                        selectedItem
                          ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/20"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {selectedItem ? (
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                            {(() => {
                              const imgUrl = getProductImageUrl(product ?? null);
                              return imgUrl ? (
                                <ClientImage
                                  src={imgUrl}
                                  alt={product?.name ?? 'Producto'}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-400">
                                  <Icon icon={Package2} className="h-8 w-8" />
                                </div>
                              );
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-50">
                              {product?.name ?? "Producto"}
                            </p>
                            {variant && (
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                Talle: {variant.size} · Color: {variant.color}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Icon icon={X} className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openProductSelector(index)}
                          className="flex w-full items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Icon icon={Package2} className="h-5 w-5" />
                          <span>Seleccionar producto {index + 1}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botón */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding || selectedItems.length !== bundle.required_quantity}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon={LoaderCircle} className="h-4 w-4 animate-spin" />
                  Agregando...
                </span>
              ) : (
                `Agregar Bundle - ${formatMoney(bundle.price)}`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal productos */}
      {showProductSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Seleccioná un producto
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowProductSelector(false);
                  setCurrentSlotIndex(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon={X} className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(80vh - 140px)" }}>
              <div className="grid gap-3 sm:grid-cols-2">
                {bundle.bundle_items
                  .filter((item) => !selectedProductIds.has(item.product_id) || selectedItems.find(s => s.productId === item.product_id))
                  .map((item) => {
                    const product = item.products;
                    if (!product) return null;
                    const isDisabled = !product.is_active || product.stock <= 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product.id)}
                        disabled={isDisabled}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        {(() => {
                          const imgUrl = getProductImageUrl(product);
                          return (
                            <>
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                                {imgUrl ? (
                                  <ClientImage
                                    src={imgUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-slate-400">
                                    <Icon icon={Package2} className="h-8 w-8" />
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {formatMoney(product.price)}
                          </p>
                          {item._all_variants && item._all_variants.length > 0 && (
                            <p className="text-xs text-slate-500">
                              {item._all_variants.filter(v => v.stock > 0).length} variantes
                            </p>
                          )}
                        </div>
                        <Icon icon={ChevronRight} className="h-5 w-5 text-slate-400" />
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal variantes */}
      {showingVariantFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Seleccioná una variante
              </h3>
              <button
                type="button"
                onClick={() => setShowingVariantFor(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon={X} className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(80vh - 140px)" }}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                    {showingVariantFor.productImage ? (
                      <ClientImage
                        src={showingVariantFor.productImage}
                        alt={showingVariantFor.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <Icon icon={Package2} className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      {showingVariantFor.productName}
                    </p>
                  </div>
                </div>

                {/* Talles */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Talle:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(showingVariantFor.variants.map((v) => v.size))).map((size) => {
                      const sizeVariants = showingVariantFor.variants.filter((v) => v.size === size && v.stock > 0);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (sizeVariants.length === 1) {
                              handleVariantSelect(showingVariantFor.productId, sizeVariants[0].id);
                            }
                          }}
                          disabled={sizeVariants.length === 0}
                          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:border-slate-600"
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colores */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Color:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(showingVariantFor.variants.map((v) => v.color))).map((color) => {
                      const colorVariants = showingVariantFor.variants.filter((v) => v.color === color && v.stock > 0);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            if (colorVariants.length === 1) {
                              handleVariantSelect(showingVariantFor.productId, colorVariants[0].id);
                            }
                          }}
                          disabled={colorVariants.length === 0}
                          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:border-slate-600"
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Combinaciones específicas */}
                {showingVariantFor.variants.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                      O todas las combinaciones:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {showingVariantFor.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleVariantSelect(showingVariantFor.productId, variant.id)}
                          className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <span>{variant.size} / {variant.color}</span>
                          <span className="text-xs text-slate-500">{variant.stock} disp.</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}
