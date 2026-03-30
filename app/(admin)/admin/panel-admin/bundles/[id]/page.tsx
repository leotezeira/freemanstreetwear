"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { X, Plus, Trash2, Search, Package2, Upload, Image as ImageIcon } from "lucide-react";
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

export default function AdminBundleFormPage({ params }: { params: Promise<{ id?: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        void searchProducts();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  async function searchProducts() {
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/products?q=${encodeURIComponent(searchQuery)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al buscar");
      setSearchResults(body.products ?? []);
    } catch (e) {
      console.error("[Search products]", e);
    } finally {
      setSearching(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/bundles/upload-image", {
        method: "POST",
        body: formData,
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
        description: "Este producto ya está en el pool del bundle",
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        variant_id: null, // El cliente elige la variante
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
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

            {/* Buscador */}
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <Icon icon={Search} className="h-4 w-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  type="text"
                  placeholder="Buscar productos por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searching && <Icon icon={Package2} className="h-4 w-4 animate-spin text-slate-400" />}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                      {/* Imagen */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
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

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{product.category ?? "Sin categoría"}</span>
                          <span>·</span>
                          <span className={product.stock > 0 ? "text-emerald-600" : "text-red-600"}>
                            {product.stock > 0 ? `${product.stock} disp.` : "Sin stock"}
                          </span>
                          {!product.is_active && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600">Inactivo</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          {formatMoney(product.price)}
                        </span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <p className="text-xs line-through text-slate-400">
                            {formatMoney(product.compare_at_price)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de productos */}
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <Icon icon={Package2} className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No hay productos en el pool
                </p>
                <p className="text-xs text-slate-500">
                  Buscá y agregá productos usando el buscador de arriba
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const product = searchResults.find((p) => p.id === item.product_id);
                  return (
                    <div
                      key={`${item.product_id}-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {product?.name ?? "Producto"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {product?.category ?? "Sin categoría"} · El cliente elige talle/color
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
