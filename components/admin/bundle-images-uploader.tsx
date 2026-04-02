"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ClientImage } from "@/components/ui/client-image";
import { GripVertical, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";

const MAX_IMAGES_PER_BUNDLE = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type BundleImage = {
  id: string;
  image_path: string;
  sort_order: number;
  is_primary: boolean;
  signed_url?: string | null; // URL firmada para mostrar en el frontend
};

type Props = {
  bundleId: string;
  initialImages?: BundleImage[];
};

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function BundleImagesUploader({ bundleId, initialImages = [] }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<BundleImage[]>(initialImages);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(
    () => images.map((img) => ({
      url: img.signed_url ?? img.image_path,
      isSigned: !!img.signed_url,
    })),
    [images]
  );

  useEffect(() => {
    return () => {
      for (const preview of previews) {
        if (preview.url.startsWith("blob:")) {
          URL.revokeObjectURL(preview.url);
        }
      }
    };
  }, [previews]);

  const handleFiles = async (files: File[]) => {
    setError(null);
    setUploading(true);

    try {
      const validFiles = files.filter((file) => {
        if (!ACCEPTED_TYPES.has(file.type)) {
          setError(`Tipo inválido: ${file.name}`);
          return false;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setError(`Archivo muy grande: ${file.name}`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      const remaining = MAX_IMAGES_PER_BUNDLE - images.length;
      if (validFiles.length > remaining) {
        setError(`Máximo ${MAX_IMAGES_PER_BUNDLE} imágenes`);
        return;
      }

      const form = new FormData();
      for (const file of validFiles) {
        form.append("files", file);
      }

      const res = await fetch(`/api/admin/bundles/${bundleId}/images`, {
        method: "POST",
        body: form,
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "No se pudo subir la imagen");
      }

      const uploadedImages = Array.isArray(body?.images) ? body.images : [];
      setImages((prev) => [...prev, ...uploadedImages]);
      
      // Limpiar error después de subida exitosa
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al subir";
      // Incluir nombre del archivo en el error si es posible
      const fileName = files[0]?.name;
      setError(fileName ? `${errorMessage}: ${fileName}` : errorMessage);
      
      // Limpiar error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    const image = images[index];
    if (!image?.id) return;

    if (!confirm("¿Eliminar esta imagen?")) return;

    try {
      const res = await fetch(
        `/api/admin/bundles/${bundleId}/images?imageId=${image.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo eliminar");
      }

      setImages((prev) => prev.filter((_, i) => i !== index));
      if (index <= primaryIndex) {
        setPrimaryIndex(Math.max(0, primaryIndex - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleSetPrimary = async (index: number) => {
    const image = images[index];
    if (!image?.id) return;

    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/images`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ primaryImageId: image.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo establecer como primaria");
      }

      setPrimaryIndex(index);
      setImages((prev) =>
        prev.map((img, i) => ({
          ...img,
          is_primary: i === index,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al establecer primaria");
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setImages((prev) => moveItem(prev, dragIndex, index));
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleReorder = async () => {
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/images/reorder`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order: images.map((img) => img.id),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo reordenar");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reordenar");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Imágenes del Bundle
        </h3>
        <span className="text-xs text-slate-500">
          {images.length} / {MAX_IMAGES_PER_BUNDLE}
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div
        className={`grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 ${images.length >= MAX_IMAGES_PER_BUNDLE ? "opacity-50 pointer-events-none" : ""}`}
      >
        {images.map((image, index) => {
          const preview = previews[index];
          const isPrimary = image.is_primary || index === primaryIndex;
          const imageUrl = preview?.url ?? image.image_path;

          return (
            <div
              key={image.id ?? index}
              className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 dark:bg-slate-900 ${
                isPrimary
                  ? "border-emerald-500"
                  : dragIndex === index
                  ? "border-slate-400"
                  : "border-slate-200 dark:border-slate-800"
              }`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              {imageUrl ? (
                <ClientImage
                  src={imageUrl}
                  alt={`Imagen ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}

              {isPrimary && (
                <div className="absolute left-1 top-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Principal
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleSetPrimary(index)}
                  disabled={isPrimary}
                  className="rounded bg-white p-1.5 text-slate-700 hover:bg-emerald-500 hover:text-white disabled:opacity-50"
                  title="Establecer como principal"
                >
                  <Icon icon={Upload} className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="rounded bg-white p-1.5 text-slate-700 hover:bg-red-500 hover:text-white"
                  title="Eliminar"
                >
                  <Icon icon={Trash2} className="h-3 w-3" />
                </button>
              </div>

              <div className="absolute right-1 top-1 cursor-grab rounded bg-white/80 p-1 text-slate-600 hover:bg-white">
                <Icon icon={GripVertical} className="h-3 w-3" />
              </div>
            </div>
          );
        })}

        {images.length < MAX_IMAGES_PER_BUNDLE && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Icon icon={Plus} className="h-5 w-5" />
            <span className="text-[10px]">Subir</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) {
            void handleFiles(files);
          }
          e.target.value = "";
        }}
        className="hidden"
      />

      {images.length > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Arrastrá para reordenar. La primera imagen es la principal.
          </p>
          <button
            type="button"
            onClick={handleReorder}
            className="btn-secondary text-xs"
          >
            Guardar orden
          </button>
        </div>
      )}
    </div>
  );
}
