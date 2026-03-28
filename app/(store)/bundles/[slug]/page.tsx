"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { CheckCircle2, LoaderCircle, Package2, Image as ImageIcon, X, ChevronRight } from "lucide-react";

type BundleProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  stock: number;
  image_path: string | null;
  product_variants: Array<{
    id: string;
    size: string;
    color: string;
    sku: string | null;
    stock: number;
    price: number | null;
  }>;
};

type BundleItem = {
  id: string;
  product_id: string;
  quantity: number;
  products: BundleProduct | null;
};

type Bundle = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  image_path: string | null;
  min_items: number;
  max_items: number;
  bundle_items: BundleItem[];
};

type SelectedItem = {
  slotIndex: number;
  productId: string;
  variantId: string | null;
  quantity: number;
};

export default function BundleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number | null>(null);

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

  function openProductSelector(slotIndex: number) {
    setCurrentSlotIndex(slotIndex);
    setShowProductSelector(true);
  }

  function handleProductSelect(productId: string) {
    if (currentSlotIndex === null) return;

    const product = bundle?.bundle_items.find(
      (item) => item.product_id === productId
    )?.products;

    if (!product) return;

    // Si el producto tiene variantes, el usuario debe seleccionar una
    if (product.product_variants && product.product_variants.length > 0) {
      // Mostrar modal de selección de variantes
      setShowProductSelector(false);
      setShowVariantSelector(productId, currentSlotIndex);
    } else {
      // Producto sin variantes, agregar directamente
      setSelectedItems((prev) => {
        const existing = prev.findIndex((item) => item.slotIndex === currentSlotIndex);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            slotIndex: currentSlotIndex,
            productId,
            variantId: null,
            quantity: 1,
          };
          return updated;
        }
        return [
          ...prev,
          {
            slotIndex: currentSlotIndex,
            productId,
            variantId: null,
            quantity: 1,
          },
        ];
      });
      setShowProductSelector(false);
      setCurrentSlotIndex(null);
    }
  }

  const [showingVariantFor, setShowingVariantFor] = useState<{
    productId: string;
    slotIndex: number;
  } | null>(null);

  function setShowVariantSelector(productId: string, slotIndex: number) {
    setShowingVariantFor({ productId, slotIndex });
  }

  function handleVariantSelect(productId: string, variantId: string) {
    if (!showingVariantFor) return;

    const { slotIndex } = showingVariantFor;

    setSelectedItems((prev) => {
      const existing = prev.findIndex((item) => item.slotIndex === slotIndex);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          slotIndex,
          productId,
          variantId,
          quantity: 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          slotIndex,
          productId,
          variantId,
          quantity: 1,
        },
      ];
    });

    setShowingVariantFor(null);
  }

  function removeSelectedItem(slotIndex: number) {
    setSelectedItems((prev) => prev.filter((item) => item.slotIndex !== slotIndex));
  }

  async function handleAddToCart() {
    if (!bundle) return;

    // Verificar que se hayan seleccionado todos los items requeridos
    if (selectedItems.length < bundle.min_items) {
      toast.push({
        variant: "error",
        title: "Productos incompletos",
        description: `Debés elegir al menos ${bundle.min_items} productos`,
      });
      return;
    }

    if (selectedItems.length > bundle.max_items) {
      toast.push({
        variant: "error",
        title: "Demasiados productos",
        description: `Máximo ${bundle.max_items} productos permitidos`,
      });
      return;
    }

    // Verificar que todos los items tengan variante si es requerida
    const itemsWithoutVariant = selectedItems.filter((item) => {
      const product = bundle.bundle_items.find(
        (p) => p.product_id === item.productId
      )?.products;
      const hasVariants = product?.product_variants && product.product_variants.length > 0;
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
      // Calcular precio total de los items para prorratear
      const totalItemsPrice = selectedItems.reduce((sum, item) => {
        const product = bundle.bundle_items.find((p) => p.product_id === item.productId);
        let itemPrice = product?.products?.price ?? 0;

        // Si hay variante seleccionada, usar su precio si es diferente
        if (item.variantId) {
          const variants = product?.products?.product_variants ?? [];
          const variant = variants.find((v) => v.id === item.variantId);
          if (variant && variant.price !== null) {
            itemPrice = variant.price;
          }
        }

        return sum + itemPrice * item.quantity;
      }, 0);

      // Generar un ID único para agrupar los items del bundle en el carrito
      const bundleGroupId = crypto.randomUUID();

      // Agregar cada producto seleccionado al carrito
      for (const selectedItem of selectedItems) {
        const product = bundle.bundle_items.find((p) => p.product_id === selectedItem.productId);
        if (!product?.products) continue;

        let itemPrice = product.products.price;
        let variantName = "";

        // Si hay variante seleccionada, usar su precio
        if (selectedItem.variantId) {
          const variants = product.products.product_variants ?? [];
          const variant = variants.find((v) => v.id === selectedItem.variantId);
          if (variant) {
            if (variant.price !== null) {
              itemPrice = variant.price;
            }
            variantName = `${variant.size} / ${variant.color}`;
          }
        }

        const proratedPrice = bundle.price * (itemPrice / totalItemsPrice);

        addToCart({
          productId: selectedItem.productId,
          variantId: selectedItem.variantId ?? undefined,
          name: variantName
            ? `${product.products.name} (${variantName})`
            : product.products.name,
          unitPrice: proratedPrice,
          quantity: selectedItem.quantity,
          imageUrl: product.products.image_path ?? null,
          stock: product.products.stock ?? 0,
          isActive: product.products.is_active ?? false,
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

  const selectedProductIds = new Set(selectedItems.map((item) => item.productId));

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

            {/* Selector de productos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  Elegí {bundle.min_items} productos{bundle.min_items !== bundle.max_items ? ` a ${bundle.max_items}` : ""}
                </h2>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {selectedItems.length} / {bundle.min_items}{bundle.min_items !== bundle.max_items ? `-${bundle.max_items}` : ""} seleccionados
                </span>
              </div>

              {/* Slots para cada producto */}
              <div className="space-y-3">
                {Array.from({ length: bundle.max_items }).map((_, index) => {
                  const selectedItem = selectedItems.find((item) => item.slotIndex === index);
                  const product = selectedItem
                    ? bundle.bundle_items.find((p) => p.product_id === selectedItem.productId)?.products
                    : null;
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
              disabled={adding || selectedItems.length < bundle.min_items}
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
      </div>

      {/* Modal de selección de productos */}
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

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product.id)}
                        disabled={!product.is_active || product.stock <= 0}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                          {product.image_path ? (
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

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {formatMoney(product.price)}
                          </p>
                          {product.product_variants && product.product_variants.length > 0 && (
                            <p className="text-xs text-slate-500">
                              {product.product_variants.length} variantes disponibles
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

      {/* Modal de selección de variantes */}
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
              {(() => {
                const product = bundle.bundle_items.find(
                  (p) => p.product_id === showingVariantFor.productId
                )?.products;

                if (!product?.product_variants) return null;

                const variants = product.product_variants;
                const sizes = Array.from(new Set(variants.map((v) => v.size))).filter(Boolean);
                const colors = Array.from(new Set(variants.map((v) => v.color))).filter(Boolean);

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-20 w-20 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                        {product.image_path ? (
                          <img
                            src={product.image_path}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Icon icon={ImageIcon} className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {product.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {formatMoney(product.price)}
                        </p>
                      </div>
                    </div>

                    {/* Fila de talles */}
                    {sizes.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                          Talle:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sizes.map((size) => {
                            const sizeVariants = variants.filter((v) => v.size === size && v.stock > 0);
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  if (sizeVariants.length === 1) {
                                    handleVariantSelect(product.id, sizeVariants[0].id);
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
                    )}

                    {/* Fila de colores */}
                    {colors.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                          Color:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {colors.map((color) => {
                            const colorVariants = variants.filter((v) => v.color === color && v.stock > 0);
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => {
                                  if (colorVariants.length === 1) {
                                    handleVariantSelect(product.id, colorVariants[0].id);
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
                    )}

                    {/* Selector completo */}
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                        O seleccioná una combinación:
                      </p>
                      <select
                        className="input-base w-full"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleVariantSelect(product.id, e.target.value);
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Elegí una variante...
                        </option>
                        {variants
                          .filter((v) => v.stock > 0)
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.size} / {v.color} - {formatMoney(v.price ?? product.price)} {v.stock <= 0 ? "(Sin stock)" : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })()}
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
