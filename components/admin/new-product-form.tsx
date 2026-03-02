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
  GripVertical,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Save,
  Search,
  Shapes,
  Tag,
  Text,
  Trash2,
  X,
} from "lucide-react";

const MAX_IMAGES_PER_PRODUCT = 6;
// Vercel Serverless Functions tienen un límite estricto de body; mantenemos margen.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  categories: string[];
  tagSuggestions?: string[];
};

type VariantRow = {
  size: string;
  color: string;
  sku: string;
  stock: string;
  price: string;
  active: boolean;
};

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function parseCsv(input: string) {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

function toIntOrZero(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function NewProductForm({ categories: categoriesProp, tagSuggestions = [] }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitModeRef = useRef<"draft" | "publish">("publish");

  const [categories, setCategories] = useState<string[]>(categoriesProp);
  const [categoryValue, setCategoryValue] = useState<string>("");
  const [categoryQuery, setCategoryQuery] = useState<string>("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [compareAtPrice, setCompareAtPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("0");
  const [weightGrams, setWeightGrams] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [widthCm, setWidthCm] = useState<string>("");
  const [lengthCm, setLengthCm] = useState<string>("");

  const [shippingPresetsLoading, setShippingPresetsLoading] = useState(false);
  const [shippingPresetsError, setShippingPresetsError] = useState<string | null>(null);
  const [shippingPresets, setShippingPresets] = useState<
    Array<{ id: string; name: string; weight_grams: number; height: number | null; width: number | null; length: number | null }>
  >([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [metaTitle, setMetaTitle] = useState<string>("");
  const [metaDescription, setMetaDescription] = useState<string>("");

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");

  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [sizeValuesInput, setSizeValuesInput] = useState<string>("");
  const [colorValuesInput, setColorValuesInput] = useState<string>("");
  const [variants, setVariants] = useState<VariantRow[]>([]);

  const [submitMode, setSubmitMode] = useState<"draft" | "publish">("publish");
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      for (const url of previews) URL.revokeObjectURL(url);
    };
  }, [previews]);

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

  const variantsJson = useMemo(() => {
    if (!variantsEnabled) return "[]";
    return JSON.stringify(
      variants
        .filter((v) => v.active)
        .map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku || null,
          stock: toIntOrZero(v.stock),
          price: v.price === "" ? null : Number(v.price),
        }))
    );
  }, [variants, variantsEnabled]);

  const tagsCsv = useMemo(() => tags.join(","), [tags]);

  const computedTotalStock = useMemo(() => {
    if (!variantsEnabled) return null;
    const active = variants.filter((v) => v.active);
    if (active.length === 0) return 0;
    return active.reduce((sum, v) => sum + toIntOrZero(v.stock), 0);
  }, [variants, variantsEnabled]);

  const canCreateCategory = useMemo(() => {
    const q = categoryQuery.trim();
    if (!q) return false;
    return !categories.some((c) => c.toLowerCase() === q.toLowerCase());
  }, [categoryQuery, categories]);

  function addFiles(newFiles: File[]) {
    const validated: File[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        errors.push(`Tipo inválido: ${file.name}`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        errors.push(`Archivo demasiado grande: ${file.name} (máx ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB)`);
        continue;
      }
      validated.push(file);
    }

    if (errors.length) {
      setErrorMessage(errors[0] ?? null);
    }

    setFiles((prev) => {
      const merged = [...prev, ...validated].slice(0, MAX_IMAGES_PER_PRODUCT);
      if (merged.length !== prev.length + validated.length && prev.length + validated.length > MAX_IMAGES_PER_PRODUCT) {
        setErrorMessage(`Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes.`);
      }
      return merged;
    });
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

  function addTag(raw: string) {
    const normalized = normalizeTag(raw);
    if (!normalized) return;
    const display = raw.trim().replace(/\s+/g, " ");
    setTags((prev) => uniqueCaseInsensitive([...prev, display]));
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  }

  function generateVariantCombinations() {
    const sizes = parseCsv(sizeValuesInput);
    const colors = parseCsv(colorValuesInput);

    if (sizes.length === 0 || colors.length === 0) {
      setErrorMessage("Para generar variantes, completá Talle y Color (valores separados por coma).");
      return;
    }

    const combos: VariantRow[] = [];
    for (const size of sizes) {
      for (const color of colors) {
        combos.push({
          size,
          color,
          sku: "",
          stock: "0",
          price: price || "",
          active: true,
        });
      }
    }

    setVariants((prev) => {
      if (prev.length === 0) return combos;

      const key = (v: VariantRow) => `${v.size}__${v.color}`.toLowerCase();
      const existing = new Map(prev.map((v) => [key(v), v] as const));
      return combos.map((c) => existing.get(key(c)) ?? c);
    });
  }

  function validateClientSide() {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Nombre requerido";
    if (!price || Number(price) < 0) errors.price = "Precio requerido";
    if (!descriptionHtml || descriptionHtml.replace(/<[^>]*>/g, "").trim().length === 0) errors.description = "Descripción requerida";
    if (compareAtPrice && Number(compareAtPrice) < 0) errors.compareAtPrice = "Número inválido";
    if (stock && Number(stock) < 0) errors.stock = "Número inválido";
    if (variantsEnabled) {
      const active = variants.filter((v) => v.active);
      if (active.length === 0) errors.variants = "Agregá al menos una variante activa o desactivá variantes";
      for (const v of active) {
        if (!v.size.trim() || !v.color.trim()) {
          errors.variants = "Todas las variantes deben tener Talle y Color";
          break;
        }
      }
    }

    // Shipping: required when publishing (needed for Correo Argentino quote).
    const publishMode = submitModeRef.current === "publish";
    const w = Number(weightGrams);
    if (publishMode) {
      if (!Number.isFinite(w) || w <= 0) {
        errors.weightGrams = "Peso requerido para cotizar envío (gramos)";
      }
    } else {
      if (weightGrams && (!Number.isFinite(w) || w < 0)) {
        errors.weightGrams = "Número inválido";
      }
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

  function submitWith(mode: "draft" | "publish") {
    submitModeRef.current = mode;
    setSubmitMode(mode);
    setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateClientSide()) {
      return;
    }

    if (files.length > MAX_IMAGES_PER_PRODUCT) {
      setErrorMessage(`Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes.`);
      return;
    }

    setLoading(true);
    try {
      const mode = submitModeRef.current;
      const form = new FormData();

      form.set("name", name);
      form.set("slug", slug);
      form.set("description", descriptionHtml);
      form.set("price", price);
      if (compareAtPrice) form.set("compareAtPrice", compareAtPrice);
      form.set("stock", String(computedTotalStock ?? stock ?? 0));
      if (weightGrams) form.set("weightGrams", weightGrams);
      if (heightCm) form.set("height", heightCm);
      if (widthCm) form.set("width", widthCm);
      if (lengthCm) form.set("length", lengthCm);
      form.set("category", categoryValue);
      form.set("tags", tagsCsv);
      form.set("metaTitle", metaTitle);
      form.set("metaDescription", metaDescription);
      form.set("isActive", mode === "publish" ? "true" : "false");
      form.set("isFeatured", isFeatured ? "true" : "false");

      form.set("variantsJson", variantsJson);
      // Nota: NO mandamos imágenes en este request para evitar FUNCTION_PAYLOAD_TOO_LARGE en Vercel.

      const res = await fetch("/api/admin/products", { method: "POST", body: form, credentials: "same-origin" });
      const rawText = await res.text().catch(() => "");
      const body = (() => {
        try {
          return rawText ? (JSON.parse(rawText) as any) : null;
        } catch {
          return null;
        }
      })();

      if (!res.ok) {
        const trimmed = rawText?.trim() ?? "";
        const looksLikeHtml = trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype html");
        const fallback = trimmed && !looksLikeHtml
          ? trimmed.slice(0, 300)
          : `${res.status} ${res.statusText}`.trim();
        throw new Error(body?.error ?? fallback ?? "No se pudo crear el producto");
      }

      const productId = body?.productId as string | undefined;
      if (!productId) throw new Error("Respuesta inválida (sin productId)");

      // Subida de imágenes en requests individuales para evitar superar el límite de payload.
      if (files.length > 0) {
        const uploaded: Array<{ id: string; sort_order: number }> = [];

        for (const file of files) {
          const imgForm = new FormData();
          imgForm.append("files", file);
          imgForm.set("setPrimary", "false");

          const imgRes = await fetch(`/api/admin/products/${productId}/images`, {
            method: "POST",
            body: imgForm,
            credentials: "same-origin",
          });

          const imgRaw = await imgRes.text().catch(() => "");
          const imgBody = (() => {
            try {
              return imgRaw ? (JSON.parse(imgRaw) as any) : null;
            } catch {
              return null;
            }
          })();

          if (!imgRes.ok) {
            const trimmed = imgRaw?.trim() ?? "";
            const looksLikeHtml = trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype html");
            const fallback = trimmed && !looksLikeHtml ? trimmed.slice(0, 300) : `${imgRes.status} ${imgRes.statusText}`.trim();
            throw new Error(imgBody?.error ?? fallback ?? "No se pudo subir la imagen");
          }

          const first = Array.isArray(imgBody?.images) ? imgBody.images[0] : null;
          if (!first?.id || typeof first?.sort_order !== "number") {
            throw new Error("Respuesta inválida al subir imagen");
          }

          uploaded.push({ id: String(first.id), sort_order: Number(first.sort_order) });
        }

        // Marcar como principal la imagen elegida en el UI (primaryIndex).
        const desired = uploaded.find((row) => row.sort_order === primaryIndex);
        if (desired) {
          const pRes = await fetch(`/api/admin/products/${productId}/images`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ primaryImageId: desired.id }),
          });
          const pRaw = await pRes.text().catch(() => "");
          const pBody = (() => {
            try {
              return pRaw ? (JSON.parse(pRaw) as any) : null;
            } catch {
              return null;
            }
          })();
          if (!pRes.ok) {
            const trimmed = pRaw?.trim() ?? "";
            const looksLikeHtml = trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype html");
            const fallback = trimmed && !looksLikeHtml ? trimmed.slice(0, 300) : `${pRes.status} ${pRes.statusText}`.trim();
            throw new Error(pBody?.error ?? fallback ?? "No se pudo marcar la imagen principal");
          }
        }
      }

      router.replace(`/admin/panel-admin/products/${productId}`);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "No se pudo crear el producto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="-mx-[4vw] lg:mx-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-[4vw] py-4 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/75 lg:rounded-2xl lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight">Nuevo producto</h1>
            <nav className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Link href="/admin/panel-admin" className="hover:text-slate-900 dark:hover:text-slate-50">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/admin/panel-admin/products" className="hover:text-slate-900 dark:hover:text-slate-50">
                Productos
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-50">Nuevo</span>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => submitWith("draft")}
              disabled={loading}
            >
              <span className="flex items-center gap-2">
                <Icon icon={Save} />
                <span>{loading && submitMode === "draft" ? "Guardando..." : "Guardar borrador"}</span>
              </span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => submitWith("publish")}
              disabled={loading}
            >
              <span className="flex items-center gap-2">
                <Icon icon={LinkIcon} />
                <span>{loading && submitMode === "publish" ? "Publicando..." : "Publicar"}</span>
              </span>
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.push("/admin/panel-admin/products")} disabled={loading}>
              Cancelar
            </button>
          </div>
        </div>
      </header>

      <form ref={formRef} onSubmit={onSubmit} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <input type="hidden" name="variantsJson" value={variantsJson} />

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
                  className={["input-base", "text-base", fieldErrors.name ? "border-red-300 focus:border-red-500 dark:border-red-900/60" : ""].join(" ")}
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
                <Icon icon={ImageIcon} />
                <span>Imágenes</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Sugerencia: imágenes cuadradas o 4:5. Máximo {MAX_IMAGES_PER_PRODUCT} archivos, hasta {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB cada uno.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />

              <div
                className={[
                  "rounded-2xl border border-dashed p-6 text-center transition",
                  dragOver ? "border-slate-900 bg-slate-50 dark:border-slate-300 dark:bg-slate-950" : "border-slate-300 dark:border-slate-700",
                ].join(" ")}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                  addFiles(Array.from(e.dataTransfer.files ?? []));
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <p className="text-sm font-semibold">Arrastrá imágenes o hacé click para subir</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Soporte múltiple. Podés reordenar arrastrando.</p>
              </div>

              {previews.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {previews.map((url, idx) => (
                    <div
                      key={url}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex === null) return;
                        setFiles((prev) => moveItem(prev, dragIndex, idx));
                        setPrimaryIndex((p) => {
                          if (p === dragIndex) return idx;
                          if (dragIndex < p && idx >= p) return p - 1;
                          if (dragIndex > p && idx <= p) return p + 1;
                          return p;
                        });
                        setDragIndex(null);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Preview" className="h-40 w-full object-cover" />

                      <div className="absolute left-2 top-2 flex items-center gap-2">
                        <span className={[
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          idx === primaryIndex ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-950" : "bg-white/90 text-slate-900 dark:bg-slate-950/80 dark:text-slate-50",
                        ].join(" ")}
                        >
                          {idx === primaryIndex ? "Principal" : `#${idx + 1}`}
                        </span>
                      </div>

                      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          className="btn-secondary px-3 py-2"
                          onClick={() => setPrimaryIndex(idx)}
                        >
                          Principal
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="rounded-xl bg-white/90 p-2 text-slate-900 dark:bg-slate-950/80 dark:text-slate-50" aria-hidden>
                            <Icon icon={GripVertical} />
                          </span>
                          <button
                            type="button"
                            className="btn-secondary px-3 py-2"
                            aria-label="Eliminar imagen"
                            onClick={() => {
                              setFiles((prev) => prev.filter((_, i) => i !== idx));
                              setPrimaryIndex((p) => {
                                if (p === idx) return 0;
                                if (idx < p) return p - 1;
                                return p;
                              });
                            }}
                          >
                            <Icon icon={Trash2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">No hay imágenes todavía.</p>
              )}
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
                    Guardá peso/medidas para reutilizarlos en otros productos (necesario para cotizaciones de Correo Argentino).
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
                  value={computedTotalStock ?? stock}
                  onChange={(e) => setStock(e.target.value)}
                  disabled={variantsEnabled}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {variantsEnabled ? "Se calcula automáticamente desde variantes." : "Usá stock directo si no tenés variantes."}
                </p>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Necesario para que Correo Argentino cotice el envío.</p>
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

          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={Shapes} />
                <span>Variantes</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={variantsEnabled} onChange={(e) => setVariantsEnabled(e.target.checked)} />
                Activar variantes
              </label>

              {variantsEnabled ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Talle (separado por comas)</label>
                      <input className="input-base" placeholder="S, M, L, XL" value={sizeValuesInput} onChange={(e) => setSizeValuesInput(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Color (separado por comas)</label>
                      <input className="input-base" placeholder="Negro, Blanco" value={colorValuesInput} onChange={(e) => setColorValuesInput(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn-secondary" onClick={generateVariantCombinations}>
                      <span className="flex items-center gap-2">
                        <Icon icon={Plus} />
                        <span>Generar combinaciones</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setVariants((prev) => [...prev, { size: "", color: "", sku: "", stock: "0", price: price || "", active: true }])}
                    >
                      Agregar fila
                    </button>
                    {fieldErrors.variants ? <p className="text-sm text-red-700 dark:text-red-300">{fieldErrors.variants}</p> : null}
                  </div>

                  {variants.length ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="min-w-[720px] w-full text-sm">
                        <thead className="bg-slate-50 text-left text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                          <tr>
                            <th className="p-3">Variante</th>
                            <th className="p-3">SKU</th>
                            <th className="p-3">Precio</th>
                            <th className="p-3">Stock</th>
                            <th className="p-3">Activa</th>
                            <th className="p-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((v, idx) => (
                            <tr key={`${idx}-${v.size}-${v.color}`} className="border-t border-slate-200 dark:border-slate-800">
                              <td className="p-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input
                                    className="input-base"
                                    placeholder="Talle"
                                    value={v.size}
                                    onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)))}
                                  />
                                  <input
                                    className="input-base"
                                    placeholder="Color"
                                    value={v.color}
                                    onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))}
                                  />
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  className="input-base"
                                  placeholder="Opcional"
                                  value={v.sku}
                                  onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x)))}
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  className="input-base"
                                  type="number"
                                  min={0}
                                  placeholder={price || "0"}
                                  value={v.price}
                                  onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))}
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  className="input-base"
                                  type="number"
                                  min={0}
                                  value={v.stock}
                                  onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, stock: e.target.value } : x)))}
                                />
                              </td>
                              <td className="p-3">
                                <label className="inline-flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={v.active}
                                    onChange={(e) => setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, active: e.target.checked } : x)))}
                                  />
                                  <span className="text-slate-600 dark:text-slate-300">{v.active ? "Sí" : "No"}</span>
                                </label>
                              </td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  className="btn-secondary px-3 py-2"
                                  aria-label="Eliminar variante"
                                  onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <Icon icon={Trash2} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">Generá combinaciones o agregá filas manualmente.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">Opcional. Si activás variantes, el stock total se calcula desde la tabla.</p>
              )}
            </div>
          </details>

          {errorMessage ? (
            <div className="card-base border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Error</p>
              <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90">{errorMessage}</p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={Search} />
                <span>Categoría</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>
            <div className="mt-4 space-y-2">
              <input
                className="input-base"
                placeholder="Buscar o escribir..."
                value={categoryQuery}
                onChange={(e) => {
                  setCategoryQuery(e.target.value);
                  setCategoryValue(e.target.value);
                }}
                list="category-options"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  disabled={!canCreateCategory || creatingCategory}
                  onClick={createCategoryInline}
                >
                  {creatingCategory ? "Creando..." : "Crear nueva"}
                </button>
                <Link href="/admin/panel-admin/categories" className="btn-ghost w-full text-center">
                  Administrar categorías
                </Link>
              </div>
            </div>
          </details>

          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={Tag} />
                <span>Etiquetas</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {t}
                    <button type="button" className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => removeTag(t)} aria-label="Quitar">
                      <Icon icon={X} />
                    </button>
                  </span>
                ))}
              </div>

              <input
                className="input-base"
                placeholder="Escribí y presioná Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                    setTagInput("");
                  }
                  if (e.key === "Backspace" && tagInput === "" && tags.length) {
                    removeTag(tags[tags.length - 1] ?? "");
                  }
                }}
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {tagSuggestions.slice(0, 50).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter para crear. Backspace para quitar.</p>
            </div>
          </details>

          <details className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={LinkIcon} />
                <span>SEO</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>
            <div className="mt-4 space-y-3">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Slug</label>
                <input className="input-base" placeholder="editable (opcional)" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Meta título</label>
                <input className="input-base" placeholder="Opcional" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Meta descripción</label>
                <textarea
                  className="input-base min-h-24"
                  placeholder="Opcional"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="text-slate-600 dark:text-slate-300">Vista previa</p>
                <p className="mt-1 text-slate-700 dark:text-slate-200">
                  https://freemanstreetwear.vercel.app/product/{slug.trim() || "tu-slug"}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                  {(metaTitle.trim() || name.trim() || "Título del producto").slice(0, 70)}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {(metaDescription.trim() || "Descripción para buscadores...").slice(0, 160)}
                </p>
              </div>
            </div>
          </details>

          <details open className="card-base">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-lg font-bold">
              <span className="flex items-center gap-2">
                <Icon icon={Box} />
                <span>Estado</span>
              </span>
              <Icon icon={ChevronDown} />
            </summary>
            <div className="mt-4 space-y-2">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <span className="font-semibold">Activo</span>
                <input
                  type="checkbox"
                  checked={submitMode === "publish"}
                  onChange={(e) => setSubmitMode(e.target.checked ? "publish" : "draft")}
                  disabled={loading}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <span className="font-semibold">Destacado</span>
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} disabled={loading} />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Al publicar, el producto aparece en la tienda. Como borrador, queda oculto.
              </p>
            </div>
          </details>
        </aside>
      </form>
    </div>
  );
}
