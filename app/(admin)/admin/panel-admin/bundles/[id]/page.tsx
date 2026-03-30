"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { X, Plus, Search, Package2, Upload, Image as ImageIcon, ChevronDown, ChevronRight, CheckSquare, Square } from "lucide-react";
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
  variants?: Array<{
    id: string;
    size: string;
    color: string;
    stock: number;
  }>;
};

type BundleItem = {
  product_id: string;
  variant_id: string | null; // null = el cliente elige la variante
};

type CategoryGroup = {
  category: string | null;
  products: Product[];
};

export default function AdminBundleFormPage({ params }: { params: Promise<{ id?: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
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
    required_quantity: "3", // Cantidad de productos que el cliente debe elegir
  });

  const [items, setItems] = useState<BundleItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isEditMode = searchParams.has("edit");

  useEffect(() => {
    if (isEditMode) {
      void loadBundle();
    }
    void loadAllProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  async function loadAllProducts() {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/products/all");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar");
      setAllProducts(body.products ?? []);
      
      // Expandir primera categoría por defecto
      const categories = Array.from(new Set((body.products ?? []).map((p: Product) => p.category ?? "Sin categoría")));
      if (categories.length > 0) {
        setExpandedCategories({ [categories[0]]: true });
      }
    } catch (e) {
      console.error("[Load products]", e);
    } finally {
      setLoadingProducts(false);
    }
  }

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
        required_quantity: String(bundle.required_quantity ?? 3),
      });
      setItems(
        bundle.bundle_items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
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

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }

  function addProducts(products: Product[]) {
    const existingIds = new Set(items.map((item) => item.product_id));
    const newProducts = products.filter((p) => !existingIds.has(p.id));
    
    if (newProducts.length === 0) {
      toast.push({
        variant: "error",
        title: "Productos ya agregados",
        description: "Todos los productos seleccionados ya están en el pool",
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      ...newProducts.map((product) => ({
        product_id: product.id,
        variant_id: null,
      })),
    ]);
    
    toast.push({
      variant: "success",
      title: "Productos agregados",
      description: `${newProducts.length} productos fueron agregados al pool`,
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemVariant(index: number, variantId: string | null) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, variant_id: variantId } : item))
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
        description: "El bundle debe tener al menos un producto en el pool",
      });
      return;
    }

    const reqQty = Number(formData.required_quantity);
    if (!reqQty || reqQty < 1) {
      toast.push({
        variant: "error",
        title: "Cantidad requerida",
        description: "El bundle debe tener una cantidad mínima de productos para elegir",
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
        required_quantity: reqQty,
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

  const calculatedCompareAtPrice = (() => {
    if (items.length === 0) return 0;
    const avgPrice = items.reduce((sum, item) => {
      const product = searchResults.find((p) => p.id === item.product_id);
      return sum + (product?.price ?? 0);
    }, 0) / items.length;
    return Math.round(avgPrice * Number(formData.required_quantity || 3));
  })();

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

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Cantidad de productos a elegir *
                </label>
                <input
                  className="input-base"
                  type="number"
                  min={1}
                  step={1}
                  value={formData.required_quantity}
                  onChange={(e) => setFormData((p) => ({ ...p, required_quantity: e.target.value }))}
                  placeholder="3"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  El cliente deberá elegir esta cantidad de productos del pool
                </p>
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
            <h2 className="text-base font-bold">Productos del Bundle</h2>

            {/* Filtro por categoría */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  selectedCategory === null
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                Todas las categorías
              </button>
              {Array.from(new Set(allProducts.map((p) => p.category ?? "Sin categoría"))).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedCategory === category
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Lista de productos por categoría */}
            {loadingProducts ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from(
                  new Set(
                    (selectedCategory
                      ? allProducts.filter((p) => p.category === selectedCategory)
                      : allProducts
                    ).map((p) => p.category ?? "Sin categoría")
                  )
                ).map((category) => {
                  const categoryProducts = (selectedCategory
                    ? allProducts.filter((p) => p.category === selectedCategory)
                    : allProducts
                  ).filter((p) => (p.category ?? "Sin categoría") === category);
                  const isExpanded = expandedCategories[category] ?? false;

                  return (
                    <div key={category} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            icon={isExpanded ? ChevronDown : ChevronRight}
                            className="h-4 w-4 text-slate-400"
                          />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {category}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({categoryProducts.length} productos)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addProducts(categoryProducts);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition"
                        >
                          Agregar todos
                        </button>
                      </button>

                      {isExpanded && (
                        <div className="max-h-96 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {categoryProducts.map((product) => {
                            const isSelected = items.some((item) => item.product_id === product.id);
                            return (
                              <label
                                key={product.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addProducts([product]);
                                    } else {
                                      const index = items.findIndex((item) => item.product_id === product.id);
                                      if (index >= 0) removeItem(index);
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                />
                                <Icon
                                  icon={isSelected ? CheckSquare : Square}
                                  className={`h-5 w-5 ${
                                    isSelected
                                      ? "text-emerald-600"
                                      : "text-slate-400"
                                  }`}
                                />
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                                  {product.image_path ? (
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
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                                    {product.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className={product.stock > 0 ? "text-emerald-600" : "text-red-600"}>
                                      {product.stock > 0 ? `${product.stock} disp.` : "Sin stock"}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                                    {formatMoney(product.price)}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Productos seleccionados */}
            {items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Productos en el pool ({items.length}):
                </h3>
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const product = allProducts.find((p) => p.id === item.product_id);
                    return (
                      <div
                        key={`${item.product_id}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                            {product?.name ?? "Producto"}
                          </p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            {product?.category ?? "Sin categoría"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Icon icon={X} className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={isPending || saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPending || saving}
            >
              {saving ? "Guardando..." : isEditMode ? "Actualizar" : "Crear Bundle"}
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
