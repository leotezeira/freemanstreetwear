"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ExistingImage = {
  id: string;
  url: string | null;
  is_primary: boolean;
};

type ProductImagesUploaderProps = {
  productId: string;
  existingImages?: ExistingImage[];
};

const MAX_IMAGES_PER_PRODUCT = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProductImagesUploader({ productId, existingImages }: ProductImagesUploaderProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [setPrimary, setSetPrimary] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const existingCount = existingImages?.length ?? 0;
  const remaining = Math.max(0, MAX_IMAGES_PER_PRODUCT - existingCount);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  async function handleUpload() {
    setErrorMessage(null);

    if (files.length === 0) {
      setErrorMessage("Seleccioná al menos una imagen");
      return;
    }

    if (remaining <= 0) {
      setErrorMessage(`Este producto ya tiene ${MAX_IMAGES_PER_PRODUCT} imágenes (máximo).`);
      return;
    }

    if (files.length > remaining) {
      setErrorMessage(`Podés subir como máximo ${remaining} imagen(es) más (límite: ${MAX_IMAGES_PER_PRODUCT}).`);
      return;
    }

    setLoading(true);

    try {
      for (const file of files) {
        if (!ACCEPTED_TYPES.has(file.type)) {
          throw new Error(`Tipo inválido: ${file.type}`);
        }
        if (file.size > MAX_IMAGE_BYTES) {
          throw new Error(`Archivo demasiado grande. Máximo ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`);
        }
      }

      const insertedIds: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("files", file);
        form.set("setPrimary", "false");

        const response = await fetch(`/api/admin/products/${productId}/images`, {
          method: "POST",
          body: form,
          credentials: "same-origin",
        });

        const rawText = await response.text().catch(() => "");
        const body = (() => {
          try {
            return rawText ? (JSON.parse(rawText) as any) : null;
          } catch {
            return null;
          }
        })();

        if (!response.ok) {
          const trimmed = rawText?.trim() ?? "";
          const looksLikeHtml = trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype html");
          const fallback = trimmed && !looksLikeHtml
            ? trimmed.slice(0, 300)
            : `${response.status} ${response.statusText}`.trim();
          throw new Error(body?.error ?? fallback ?? "No se pudo subir la imagen");
        }

        const first = Array.isArray(body?.images) ? body.images[0] : null;
        if (first?.id) insertedIds.push(String(first.id));
      }

      if (setPrimary && insertedIds.length > 0) {
        const pRes = await fetch(`/api/admin/products/${productId}/images`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ primaryImageId: insertedIds[0] }),
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
          throw new Error(pBody?.error ?? "No se pudo marcar la imagen principal");
        }
      }

      setFiles([]);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={setPrimary} onChange={(e) => setSetPrimary(e.target.checked)} />
          Marcar la primera como principal
        </label>

        <button className="btn-secondary" type="button" onClick={handleUpload} disabled={loading}>
          {loading ? "Subiendo..." : "Subir imágenes"}
        </button>
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {previews.map((url) => (
            <img key={url} src={url} alt="Preview" className="h-20 w-full rounded-lg border border-slate-200 object-cover" />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Máximo {MAX_IMAGES_PER_PRODUCT} imágenes por producto. Actualmente: {existingCount}. Disponibles: {remaining}.
      </p>

      {existingImages && existingImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {existingImages.map((img) => (
            <div key={img.id} className="relative">
              <img
                src={img.url ?? "/product-placeholder.svg"}
                alt="Imagen producto"
                className="h-20 w-full rounded-lg border border-slate-200 object-cover"
              />
              {img.is_primary ? (
                <span className="absolute left-1 top-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Principal
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
