"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type HomeContentProps = {
  topBarText: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  heroImageUrl: string;
  promoTitle: string;
  promoSubtitle: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
};

export default function AdminContentForm({ initialContent }: { initialContent: HomeContentProps }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch("/api/admin/content", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      setSuccess(true);
      // Reload the page after 1.5 seconds to show updated content
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {success && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Home actualizada correctamente.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-base grid gap-3" encType="multipart/form-data">
        <input
          name="topBarText"
          defaultValue={initialContent.topBarText}
          className="input-base"
          placeholder="Texto barra superior (ej. DROP 03 LIVE NOW // ENVÍO GRATIS)"
          disabled={loading}
        />

        <input
          name="heroTitle"
          defaultValue={initialContent.heroTitle}
          className="input-base"
          placeholder="Título hero"
          required
          disabled={loading}
        />
        <textarea
          name="heroSubtitle"
          defaultValue={initialContent.heroSubtitle}
          className="input-base min-h-20"
          placeholder="Subtítulo hero"
          required
          disabled={loading}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="heroCtaLabel"
            defaultValue={initialContent.heroCtaLabel}
            className="input-base"
            placeholder="Texto CTA"
            required
            disabled={loading}
          />
          <input
            name="heroCtaHref"
            defaultValue={initialContent.heroCtaHref}
            className="input-base"
            placeholder="Link CTA"
            required
            disabled={loading}
          />
        </div>

        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Imagen hero (subir desde tu dispositivo)
        </label>
        <input
          name="heroImageFile"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="input-base"
          disabled={loading}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Si subís una imagen nueva, reemplaza automáticamente la actual.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
          <img src={initialContent.heroImageUrl} alt="Preview hero" className="h-44 w-full object-cover" loading="lazy" />
        </div>

        <input
          name="promoTitle"
          defaultValue={initialContent.promoTitle}
          className="input-base"
          placeholder="Título promo"
          required
          disabled={loading}
        />
        <input
          name="promoSubtitle"
          defaultValue={initialContent.promoSubtitle}
          className="input-base"
          placeholder="Subtítulo promo"
          required
          disabled={loading}
        />
        <input
          name="newsletterTitle"
          defaultValue={initialContent.newsletterTitle}
          className="input-base"
          placeholder="Título newsletter"
          required
          disabled={loading}
        />
        <input
          name="newsletterSubtitle"
          defaultValue={initialContent.newsletterSubtitle}
          className="input-base"
          placeholder="Subtítulo newsletter"
          required
          disabled={loading}
        />

        <button
          className="btn-primary w-full md:w-auto"
          type="submit"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar Home"}
        </button>
      </form>
    </>
  );
}
