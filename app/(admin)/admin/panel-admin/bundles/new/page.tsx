// =====================================================
// ADMIN: /admin/panel-admin/bundles/new
// Formulario para crear bundle
// =====================================================

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { X, Upload, Image as ImageIcon, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  product_images?: Array<{
    image_path: string | null;
    is_primary: boolean;
  }>;
};

type BundleItem = {
  product_id: string;
  variant_id?: string | null;
};

function getProductImageUrl(product: Product): string | null {
  if (!product?.product_images?.length) return null;
  const primary = product.product_images.find(img => img.is_primary);
  return primary?.image_path ?? product.product_images[0]?.image_path ?? null;
}

export default function AdminBundleNewPage() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    price: "",
    compare_at_price: "",
    is_active: true,
    image_path: "",
    required_quantity: "3",
  });

  const [items, setItems] = useState<BundleItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [createdBundleId, setCreatedBundleId] = useState<string | null>(null);

  useEffect(() => {
    void loadAllProducts();
  }, []);

  async function loadAllProducts() {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/products/all");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar");
      setAllProducts(body.products ?? []);

      const categories = Array.from(
        new Set((body.products ?? []).map((p: Product) => p.category ?? "Sin categoría"))
      ) as string[];
      if (categories.length > 0) {
        setExpandedCategories({ [categories[0]]: true });
      }
    } catch (e) {
      console.error("[Load products]", e);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!createdBundleId) {
      toast.push({
        variant: "error",
        title: "Primero guardá el bundle",
        description: "Tenés que guardar el bundle antes de subir imágenes",
      });
      return;
    }

    try {
      const formDataImg = new FormData();
      formDataImg.append("files", file);

      const res = await fetch(`/api/admin/bundles/${createdBundleId}/images`, {
        method: "POST",
        body: formDataImg,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Error al subir");

      const uploadedImages = result.images ?? [];
      if (uploadedImages.length > 0) {
        setFormData((p) => ({ ...p, image_path: uploadedImages[0].image_path }));
      }

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  function handleAddProduct(product: Product) {
    if (items.find((i) => i.product_id === product.id)) {
      toast.push({
        variant: "error",
        title: "Producto duplicado",
        description: "Este producto ya está en el bundle",
      });
      return;
    }

    setItems((prev) => [...prev, { product_id: product.id }]);
    setShowProductSelector(false);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
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
      const payload = {
        ...formData,
        price: Number(formData.price) || 0,
        compare_at_price: formData.compare_at_price ? Number(formData.compare_at_price) : undefined,
        required_quantity: Number(formData.required_quantity) || 3,
        items,
      };

      const res = await fetch("/api/admin/bundles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al guardar");

      const createdId = body.bundle?.id;
      if (createdId) {
        setCreatedBundleId(createdId);
      }

      toast.push({
        variant: "success",
        title: "Guardado",
        description: "El bundle fue guardado exitosamente",
      });

      if (createdId) {
        router.push(`/admin/panel-admin/bundles/${createdId}`);
      } else {
        router.push("/admin/panel-admin/bundles");
        router.refresh();
      }
    } catch (err) {
      toast.push({
        variant: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar el bundle",
      });
    } finally {
      setSaving(false);
    }
  }

  const categories = Array.from(
    new Set(allProducts.map((p) => p.category ?? "Sin categoría"))
  ) as string[];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Nuevo Bundle</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Creá un nuevo bundle
          </p>
        </div>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="card-base space-y-4">
          <h2 className="text-lg font-bold">Información Básica</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Nombre *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="input"
                placeholder="Ej: Bundle Verano"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                className="input"
                placeholder="bundle-verano"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="input min-h-[80px]"
              placeholder="Descripción del bundle..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Precio *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                className="input"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Precio anterior</label>
              <input
                type="number"
                step="0.01"
                value={formData.compare_at_price}
                onChange={(e) => setFormData((p) => ({ ...p, compare_at_price: e.target.value }))}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Cantidad a elegir *</label>
              <input
                type="number"
                value={formData.required_quantity}
                onChange={(e) => setFormData((p) => ({ ...p, required_quantity: e.target.value }))}
                className="input"
                placeholder="3"
                min="1"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium">
              Bundle activo (visible en la tienda)
            </label>
          </div>
        </div>

        {/* Imagen del bundle */}
        <div className="card-base space-y-4">
          <h2 className="text-lg font-bold">Imagen del Bundle</h2>

          <div className="flex items-center gap-4">
            <div className="aspect-square h-32 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
              {formData.image_path ? (
                <img src={formData.image_path} alt="Bundle" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <Icon icon={ImageIcon} className="h-8 w-8" />
                </div>
              )}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!createdBundleId}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon icon={Upload} className="h-4 w-4" />
                {createdBundleId ? "Subir imagen" : "Guardá primero"}
              </button>
              <p className="mt-1 text-xs text-slate-500">
                {createdBundleId
                  ? "JPG, PNG o WEBP. Máximo 4MB."
                  : "Tenés que guardar el bundle antes de subir imágenes"}
              </p>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="card-base space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Productos del Bundle</h2>
            <button
              type="button"
              onClick={() => setShowProductSelector(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Icon icon={Plus} className="h-4 w-4" />
              Agregar Producto
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <Icon icon={ImageIcon} className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                No hay productos agregados
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => {
                const product = allProducts.find((p) => p.id === item.product_id);
                const productImageUrl = product ? getProductImageUrl(product) : null;
                return (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded bg-slate-100 dark:bg-slate-900">
                      {productImageUrl ? (
                        <img
                          src={productImageUrl}
                          alt={product?.name ?? "Producto"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Icon icon={ImageIcon} className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-50">
                        {product?.name ?? "Producto eliminado"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product ? `$${product.price}` : "No disponible"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Icon icon={Trash2} className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "Creando Bundle..." : "Crear Bundle"}
          </button>
        </div>
      </form>

      {/* Modal selector de productos */}
      {showProductSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Seleccionar Productos
              </h3>
              <button
                type="button"
                onClick={() => setShowProductSelector(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon={X} className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(80vh - 140px)" }}>
              {loadingProducts ? (
                <div className="py-8 text-center text-slate-500">Cargando productos...</div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category) => {
                    const categoryProducts = allProducts.filter(
                      (p) => (p.category ?? "Sin categoría") === category
                    );
                    const isExpanded = expandedCategories[category];

                    return (
                      <div key={category} className="rounded-lg border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="flex w-full items-center justify-between p-3 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <span>{category}</span>
                          <Icon
                            icon={isExpanded ? ChevronDown : ChevronRight}
                            className="h-5 w-5"
                          />
                        </button>

                        {isExpanded && (
                          <div className="grid gap-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
                            {categoryProducts.map((product) => {
                              const isSelected = items.some((i) => i.product_id === product.id);
                              const isDisabled = !product.is_active || product.stock <= 0;

                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => handleAddProduct(product)}
                                  disabled={isSelected || isDisabled}
                                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                                    isSelected
                                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/20"
                                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-900">
                                    {(() => {
                                      const imgUrl = getProductImageUrl(product);
                                      return imgUrl ? (
                                        <img
                                          src={imgUrl}
                                          alt={product.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full items-center justify-center text-slate-400">
                                          <Icon icon={ImageIcon} className="h-6 w-6" />
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      ${product.price}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <Icon icon={X} className="h-4 w-4 text-emerald-600" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
