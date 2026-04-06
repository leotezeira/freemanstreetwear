"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";

export function LogoUploader({ currentUrl }: { currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/branding/logo", { method: "POST", body: form, credentials: "same-origin" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Error al subir");
      setPreview(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="text-sm font-semibold">Logo imagen</label>
      {preview && (
        <div className="flex items-center gap-3">
          <img src={preview} alt="Logo actual" className="h-12 object-contain rounded border border-slate-200 bg-slate-50 p-1" />
          <span className="text-xs text-slate-500">Logo actual</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        type="button"
        className="btn-secondary w-full md:w-auto"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Subiendo..." : preview ? "Cambiar logo" : "Subir logo"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">PNG, JPG, WEBP o SVG. Se redimensiona a 120px de alto automáticamente.</p>
    </div>
  );
}
