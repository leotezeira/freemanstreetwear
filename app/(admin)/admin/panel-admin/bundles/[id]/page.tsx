"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { X, Plus, Upload, Image as ImageIcon, Package2, ChevronRight, ChevronDown } from "lucide-react";
import type { BundleWithItems } from "@/types/bundle";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  is_active: boolean;
  image_path?: string | null;
};

type BundleItem = {
  product_id: string;
  quantity: number;
};

type GroupedProducts = Record<string, Product[]>;

export default function AdminBundleFormPage({ params }: { params: Promise<{ id?: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    price: "",
    compare_at_price: "",
    is_active: true,
    image_path: "",
    min_items: 1,
    max_items: 1,
  });

  const [items, setItems] = useState<BundleItem[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProducts>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showProductModal, setShowProductModal] = useState(false);

  const isEditMode = searchParams.has("edit");

  useEffect(() => {
    if (isEditMode) {
      void loadBundle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  async function loadBundle() {
    const { id } = await params;
    if (!id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bundles/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar");

      const bundle: BundleWithItems = body.bundle;
      setFormData({
        name: bundle.name,
        description: bundle.description ?? "",
        slug: bundle.slug ?? "",
        price: String(bundle.price),
        compare_at_price: bundle.compare_at_price ? String(bundle.compare_at_price) : "",
        is_active: bundle.is_active,
        image_path: bundle.image_path ?? "",
        min_items: bundle.min_items ?? 1,
        max_items: bundle.max_items ?? 1,
      });
      setItems(
        bundle.bundle_items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo cargar el bundle",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadAllProducts() {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/products?byCategory=true");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar productos");
      setGroupedProducts(body.grouped ?? {});
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudieron cargar los productos",
      });
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    if (showProductModal && Object.keys(groupedProducts).length === 0) {
      void loadAllProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProductModal]);

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formDataImg = new FormData();
      formDataImg.append("image", file);

      const res = await fetch("/api/admin/bundles/upload-image", {
        method: "POST",
        body: formDataImg,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Error al subir");

      setFormData((p) => ({ ...p, image_path: result.imageUrl }));
      toast.push({
        variant: "success",
        title: "Imagen subida",
        description: "La imagen fue subida exitosamente",
      });
    } catch (err) {
      toast.push({
        variant: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo subir la imagen",
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addProduct(product: Product) {
    const alreadyAdded = items.some((item) => item.product_id === product.id);
    if (alreadyAdded) {
      toast.push({
        variant: "error",
        title: "Producto ya agregado",
        description: "Este producto ya está en el bundle",
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        quantity: 1,
      },
    ]);
    setShowProductModal(false);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemQuantity(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.push({
        variant: "error",
        title: "Nombre requerido",
        description: "El bundle debe tener un nombre",
      });
      return;
    }

    if (items.length === 0) {
      toast.push({
        variant: "error",
        title: "Productos requeridos",
        description: "El bundle debe tener al menos un producto",
      });
      return;
    }

    setSaving(true);
    try {
      const { id } = await params;
      const url = id ? `/api/admin/bundles/${id}` : "/api/admin/bundles";
      const method = id ? "PUT" : "POST";

      const body = {
        ...formData,
        price: Number(formData.price) || 0,
        compare_at_price: formData.compare_at_price ? Number(formData.compare_at_price) : undefined,
        items,
      };

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Error al guardar");

      toast.push({
        variant: "success",
        title: "Guardado",
        description: "El bundle fue guardado exitosamente",
      });

      router.push("/admin/panel-admin/bundles");
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo guardar el bundle",
      });
    } finally {
      setSaving(false);
    }
  }

  const calculatedCompareAtPrice = items.reduce((sum, item) => {
    const product = Object.values(groupedProducts)
      .flat()
      .find((p) => p.id === item.product_id);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);

  function getProductById(id: string): Product | undefined {
    return Object.values(groupedProducts)
      .flat()
      .find((p) => p.id === id);
  }

  return (
    <section className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-black tracking-tight">
          {isEditMode ? "Editar Bundle" : "Nuevo Bundle"}
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          <div className="h-10 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          <div className="h-10 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="card-base space-y-4">
            <h2 className="text-base font-bold">Información del Bundle</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nombre *
                </label>
                <input
                  className="input-base"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Bundle Remeras Básicas"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Descripción
                </label>
                <textarea
                  className="input-base"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción del bundle..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Slug
                </label>
                <input
                  className="input-base"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="bundle-remeras-basicas"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Se auto-genera si lo dejás vacío
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Imagen del Bundle
                </label>
                <div className="mt-2 flex items-start gap-4">
                  {formData.image_path ? (
                    <div className="relative group">
                      <img
                        src={formData.image_path}
                        alt="Vista previa"
                        className="h-32 w-32 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, image_path: "" }))}
                        className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        <Icon icon={X} className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <div className="text-center">
                        <Icon icon={Upload} className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-1 text-xs text-slate-500">Click para subir</p>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    <input
                      className="input-base"
                      type="text"
                      value={formData.image_path}
                      onChange={(e) => setFormData((p) => ({ ...p, image_path: e.target.value }))}
                      placeholder="O pegá una URL de imagen..."
                      disabled={uploadingImage}
                    />
                    {uploadingImage && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Icon icon={Package2} className="h-3 w-3 animate-spin" />
                        Subiendo imagen...
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Formatos: JPG, PNG, WebP · Máx: 5MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="is_active" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Bundle activo (visible en la tienda)
              </label>
            </div>
          </div>

          {/* Configuración de items */}
          <div className="card-base space-y-4">
            <h2 className="text-base font-bold">Configuración del Bundle</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Mínimo de productos a elegir *
                </label>
                <input
                  className="input-base"
                  type="number"
                  min={1}
                  value={formData.min_items}
                  onChange={(e) => setFormData((p) => ({ ...p, min_items: Number(e.target.value) }))}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Cantidad mínima de productos que el cliente debe elegir
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Máximo de productos a elegir *
                </label>
                <input
                  className="input-base"
                  type="number"
                  min={1}
                  value={formData.max_items}
                  onChange={(e) => setFormData((p) => ({ ...p, max_items: Number(e.target.value) }))}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Cantidad máxima de productos que el cliente puede elegir
                </p>
              </div>
            </div>
          </div>

          {/* Precio */}
          <div className="card-base space-y-4">
            <h2 className="text-base font-bold">Precios</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Precio del Bundle *
                </label>
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  step={100}
                  value={formData.price}
                  onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                  placeholder="0"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  El precio que pagará el cliente
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Precio de Comparación
                </label>
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  step={100}
                  value={formData.compare_at_price}
                  onChange={(e) => setFormData((p) => ({ ...p, compare_at_price: e.target.value }))}
                  placeholder={calculatedCompareAtPrice > 0 ? `Calculado: $${calculatedCompareAtPrice}` : "0"}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Precio original (suma de productos). Se calcula automáticamente si lo dejás vacío.
                </p>
              </div>
            </div>

            {formData.price && calculatedCompareAtPrice > 0 && (
              <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Ahorro: {formatMoney(calculatedCompareAtPrice - Number(formData.price))}{" "}
                  ({Math.round(((calculatedCompareAtPrice - Number(formData.price)) / calculatedCompareAtPrice) * 100)}%)
                </p>
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="card-base space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Productos Disponibles</h2>
              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                className="btn-primary text-sm"
              >
                <span className="flex items-center gap-2">
                  <Icon icon={Plus} className="h-4 w-4" />
                  Agregar Productos
                </span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <Icon icon={Package2} className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No hay productos agregados
                </p>
                <p className="text-xs text-slate-500">
                  Hacé click en &quot;Agregar Productos&quot; para seleccionar productos por categoría
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const product = getProductById(item.product_id);
                  return (
                    <div
                      key={`${item.product_id}-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                        {product?.image_path ? (
                          <img
                            src={product.image_path}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Icon icon={ImageIcon} className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                          {product?.name ?? "Producto"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                            className="w-16 rounded border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                          <span className="text-xs text-slate-500">unidades</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          {formatMoney((product?.price ?? 0) * item.quantity)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatMoney(product?.price ?? 0)} c/u
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                        title="Eliminar"
                      >
                        <Icon icon={X} className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal de Productos */}
          {showProductModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    Agregar Productos
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Icon icon={X} className="h-6 w-6" />
                  </button>
                </div>

                <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(80vh - 140px)" }}>
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-8">
                      <Icon icon={Package2} className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : Object.keys(groupedProducts).length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      No hay productos disponibles
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(groupedProducts).map(([category, products]) => (
                        <div key={category} className="rounded-xl border border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <span className="font-semibold text-slate-900 dark:text-slate-50">
                              {category} ({products.length})
                            </span>
                            <Icon
                              icon={expandedCategories[category] ? ChevronDown : ChevronRight}
                              className="h-5 w-5 text-slate-400"
                            />
                          </button>

                          {expandedCategories[category] && (
                            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                              <div className="grid gap-3 sm:grid-cols-2">
                                {products.map((product) => (
                                  <div
                                    key={product.id}
                                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                                        {product.image_path ? (
                                          <img
                                            src={product.image_path}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full items-center justify-center text-slate-400">
                                            <Icon icon={ImageIcon} className="h-6 w-6" />
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                                          {product.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Stock:{" "}
                                          <span
                                            className={
                                              product.stock > 0
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                            }
                                          >
                                            {product.stock > 0 ? product.stock : "Sin stock"}
                                          </span>
                                        </p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                                          {formatMoney(product.price)}
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => addProduct(product)}
                                      disabled={product.stock <= 0 || !product.is_active}
                                      className="btn-primary mt-2 w-full text-xs"
                                    >
                                      Agregar
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Icon icon={Package2} className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : (
                "Guardar Bundle"
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}
