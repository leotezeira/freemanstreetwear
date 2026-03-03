"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Box,
  ChevronDown,
  DollarSign,
  Image as ImageIcon,
  Link as LinkIcon,
  Save,
  Tag,
  Text,
} from "lucide-react";

type Props = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    compare_at_price: number | null;
    stock: number;
    category: string | null;
    tags: string[];
    weight_grams: number | null;
    height: number | null;
    width: number | null;
    length: number | null;
    meta_title: string | null;
    meta_description: string | null;
    is_active: boolean;
  };
  categories: string[];
};

type ShippingPreset = {
  id: string;
  name: string;
  weight_grams: number;
  height: number | null;
  width: number | null;
  length: number | null;
};

function normalizeTag(tag: string) {
  return tag
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

function parseCsv(input: string) {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function EditProductForm({ product, categories: categoriesProp }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [name, setName] = useState(product.name);
  const [descriptionHtml, setDescriptionHtml] = useState(product.description);
  const [price, setPrice] = useState<string>(String(product.price));
  const [compareAtPrice, setCompareAtPrice] = useState<string>(product.compare_at_price ? String(product.compare_at_price) : "");
  const [stock, setStock] = useState<string>(String(product.stock));
  const [weightGrams, setWeightGrams] = useState<string>(product.weight_grams ? String(product.weight_grams) : "");
  const [heightCm, setHeightCm] = useState<string>(product.height ? String(product.height) : "");
  const [widthCm, setWidthCm] = useState<string>(product.width ? String(product.width) : "");
  const [lengthCm, setLengthCm] = useState<string>(product.length ? String(product.length) : "");

  const [shippingPresetsLoading, setShippingPresetsLoading] = useState(false);
  const [shippingPresetsError, setShippingPresetsError] = useState<string | null>(null);
  const [shippingPresets, setShippingPresets] = useState<ShippingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [savingPreset, setSavingPreset] = useState(false);

  const [categories, setCategories] = useState<string[]>(categoriesProp);
  const [categoryValue, setCategoryValue] = useState<string>(product.category ?? "");
  const [categoryQuery, setCategoryQuery] = useState<string>("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [metaTitle, setMetaTitle] = useState<string>(product.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState<string>(product.meta_description ?? "");

  const [tags, setTags] = useState<string[]>(product.tags ?? []);
  const [tagInput, setTagInput] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canCreateCategory = useMemo(() => {
    const q = categoryQuery.trim();
    if (!q) return false;
    return !categories.some((c) => c.toLowerCase() === q.toLowerCase());
  }, [categoryQuery, categories]);

  const tagsCsv = useMemo(() => tags.join(","), [tags]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setShippingPresetsLoading(true);
      setShippingPresetsError(null);
      try {
        const res = await fetch("/api/admin/shipping-presets");
        const body = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(body?.error ?? "No se pudieron cargar las plantillas de envío");
        const presets = Array.isArray(body?.presets) ? body.presets : [];
        if (cancelled) return;
        setShippingPresets(presets);
      } catch (e) {
        if (cancelled) return;
        setShippingPresetsError(e instanceof Error ? e.message : "No se pudieron cargar las plantillas de envío");
      } finally {
        if (!cancelled) setShippingPresetsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function addTag(raw: string) {
    const normalized = normalizeTag(raw);
    if (!normalized) return;
    const display = raw.trim().replace(/\s+/g, " ");
    setTags((prev) => uniqueCaseInsensitive([...prev, display]));
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  }

  async function createCategoryInline() {
    const name = categoryQuery.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "No se pudo crear la categoría");
      setCategories((prev) => uniqueCaseInsensitive([...prev, name]).sort((a, b) => a.localeCompare(b)));
      setCategoryValue(name);
      setCategoryQuery(name);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "No se pudo crear la categoría");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function saveShippingPreset() {
    setSavingPreset(true);
    setShippingPresetsError(null);
    try {
      const name = newPresetName.trim();
      if (!name) throw new Error("Ingresá un nombre para la plantilla");
      const w = Number(weightGrams);
      if (!Number.isFinite(w) || w <= 0) throw new Error("El peso debe ser mayor a 0");

      const payload = {
        name,
        weightGrams: Math.floor(w),
        height: heightCm ? Math.max(0, Math.floor(Number(heightCm))) : null,
        width: widthCm ? Math.max(0, Math.floor(Number(widthCm))) : null,
        length: lengthCm ? Math.max(0, Math.floor(Number(lengthCm))) : null,
      };

      const res = await fetch("/api/admin/shipping-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "No se pudo guardar la plantilla");

      const preset = body?.preset;
      if (preset?.id) {
        setShippingPresets((prev) => {
          const without = prev.filter((p) => p.id !== preset.id);
          return [preset, ...without];
        });
        setSelectedPresetId(String(preset.id));
      }
    } catch (e) {
      setShippingPresetsError(e instanceof Error ? e.message : "No se pudo guardar la plantilla");
    } finally {
      setSavingPreset(false);
    }
  }

  function validateClientSide() {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Nombre requerido";
    if (!price || Number(price) < 0) errors.price = "Precio requerido";
    if (!descriptionHtml || descriptionHtml.replace(/<[^>]*>/g, "").trim().length === 0) errors.description = "Descripción requerida";
    if (compareAtPrice && Number(compareAtPrice) < 0) errors.compareAtPrice = "Número inválido";
    if (stock && Number(stock) < 0) errors.stock = "Número inválido";

    const w = Number(weightGrams);
    if (weightGrams && (!Number.isFinite(w) || w < 0)) {
      errors.weightGrams = "Número inválido";
    }

    const h = heightCm ? Number(heightCm) : null;
    const wi = widthCm ? Number(widthCm) : null;
    const l = lengthCm ? Number(lengthCm) : null;
    if (h !== null && (!Number.isFinite(h) || h < 0)) errors.height = "Número inválido";
    if (wi !== null && (!Number.isFinite(wi) || wi < 0)) errors.width = "Número inválido";
    if (l !== null && (!Number.isFinite(l) || l < 0)) errors.length = "Número inválido";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateClientSide()) {
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();

      form.set("id", product.id);
      form.set("name", name);
      form.set("description", descriptionHtml);
      form.set("price", price);
      if (compareAtPrice) form.set("compareAtPrice", compareAtPrice);
      form.set("stock", String(stock ?? 0));
      if (weightGrams) form.set("weightGrams", weightGrams);
      if (heightCm) form.set("height", heightCm);
      if (widthCm) form.set("width", widthCm);
      if (lengthCm) form.set("length", lengthCm);
      form.set("category", categoryValue);
      form.set("tags", tagsCsv);
      form.set("metaTitle", metaTitle);
      form.set("metaDescription", metaDescription);
      form.set("isActive", product.is_active ? "true" : "false");

      const res = await fetch("/api/admin/products/edit", { method: "POST", body: form, credentials: "same-origin" });
      const body = (await res.json().catch(() => null)) as any;

      if (!res.ok) throw new Error(body?.error ?? "No se pudo guardar el producto");

      router.refresh();
      setErrorMessage(null);
      // Feedback silencioso de éxito
      setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "No se pudo guardar el producto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="-mx-[4vw] lg:mx-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-[4vw] py-4 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/75 lg:rounded-2xl lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight">Editar producto</h1>
            <nav className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Link href="/admin/panel-admin" className="hover:text-slate-900 dark:hover:text-slate-50">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/admin/panel-admin/products" className="hover:text-slate-900 dark:hover:text-slate-50">
                Productos
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-50">{product.name}</span>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={loading}
            >
              <span className="flex items-center gap-2">
                <Icon icon={Save} />
                <span>{loading ? "Guardando..." : "Guardar cambios"}</span>
              </span>
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.back()} disabled={loading}>
              Cancelar
            </button>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <form ref={formRef} onSubmit={onSubmit} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={Text} />
                <span>Información básica</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Nombre del producto</label>
                <input
                  className={["input-base", fieldErrors.name ? "border-red-300 focus:border-red-500 dark:border-red-900/60" : ""].join(" ")}
                  placeholder="Ej: Remera Oversize Negra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {fieldErrors.name ? <p className="text-sm text-red-700 dark:text-red-300">{fieldErrors.name}</p> : null}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Descripción</label>
                <RichTextEditor
                  value={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="Descripción del producto..."
                  required
                  error={fieldErrors.description ?? null}
                />
              </div>
            </div>
          </details>

          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={DollarSign} />
                <span>Precio</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Precio</label>
                <input
                  className={["input-base", fieldErrors.price ? "border-red-300 focus:border-red-500 dark:border-red-900/60" : ""].join(" ")}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                {fieldErrors.price ? <p className="text-sm text-red-700 dark:text-red-300">{fieldErrors.price}</p> : null}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Precio de comparación</label>
                <input
                  className={["input-base", fieldErrors.compareAtPrice ? "border-red-300 focus:border-red-500 dark:border-red-900/60" : ""].join(" ")}
                  type="number"
                  min={0}
                  placeholder="Opcional"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                />
              </div>
            </div>
          </details>

          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={Box} />
                <span>Inventario</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Plantillas de envío</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Guardá peso/medidas para reutilizarlos en otros productos.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Aplicar plantilla</label>
                  <select
                    className="input-base"
                    value={selectedPresetId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPresetId(id);
                      const preset = shippingPresets.find((p) => p.id === id);
                      if (!preset) return;
                      setWeightGrams(String(preset.weight_grams ?? ""));
                      setHeightCm(preset.height === null ? "" : String(preset.height));
                      setWidthCm(preset.width === null ? "" : String(preset.width));
                      setLengthCm(preset.length === null ? "" : String(preset.length));
                    }}
                    disabled={shippingPresetsLoading}
                  >
                    <option value="">{shippingPresetsLoading ? "Cargando..." : "Seleccionar"}</option>
                    {shippingPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.weight_grams}g
                      </option>
                    ))}
                  </select>
                  {shippingPresetsError ? (
                    <p className="text-sm text-red-700 dark:text-red-300">{shippingPresetsError}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Guardar como plantilla</label>
                  <div className="flex gap-2">
                    <input
                      className="input-base"
                      placeholder="Ej: Remera / Pack S"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-secondary whitespace-nowrap"
                      onClick={saveShippingPreset}
                      disabled={savingPreset}
                    >
                      {savingPreset ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Se guarda/actualiza por nombre.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Stock disponible</label>
                <input
                  className={["input-base", fieldErrors.stock ? "border-red-300 focus:border-red-500 dark:border-red-900/60" : ""].join(" ")}
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Peso (gramos)</label>
                <input
                  className={["input-base", fieldErrors.weightGrams ? "border-red-300 focus:border-red-500 dark:border-red-900/60" : ""].join(" ")}
                  type="number"
                  min={0}
                  placeholder="Requerido para envío"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                />
                {fieldErrors.weightGrams ? (
                  <p className="text-sm text-red-700 dark:text-red-300">{fieldErrors.weightGrams}</p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Necesario para cálculo logístico del envío.</p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Alto (cm)</label>
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  placeholder="Opcional"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Ancho (cm)</label>
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  placeholder="Opcional"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Largo (cm)</label>
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  placeholder="Opcional"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                />
              </div>
            </div>
          </details>
        </div>

        <div className="space-y-4">
          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={Tag} />
                <span>Organización</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Categoría</label>
                <div className="flex gap-2">
                  <select className="input-base" value={categoryValue} onChange={(e) => setCategoryValue(e.target.value)}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-base"
                    placeholder="Nueva..."
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                  />
                </div>
                {canCreateCategory ? (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={createCategoryInline}
                    disabled={creatingCategory}
                  >
                    {creatingCategory ? "Creando..." : `Crear \"${categoryQuery}\"`}
                  </button>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Tags</label>
                <div className="flex gap-2">
                  <input
                    className="input-base"
                    placeholder="Ingresá un tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(tagInput);
                        setTagInput("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      addTag(tagInput);
                      setTagInput("");
                    }}
                  >
                    Agregar
                  </button>
                </div>

                {tags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <span aria-hidden>×</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">SEO</label>
                <input
                  className="input-base text-sm"
                  placeholder="Meta title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
                <textarea
                  className="input-base text-sm"
                  placeholder="Meta description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </details>
        </div>
      </form>
    </div>
  );
}
