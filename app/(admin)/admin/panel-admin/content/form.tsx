"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

type HomeContentProps = {
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
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState(initialContent.heroImageUrl);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

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

      toast.push({
        variant: "success",
        title: "Éxito",
        description: "Home actualizada correctamente.",
      });

      // Refresh the image preview
      const newHeroImageUrl = formData.get("heroImageUrl") as string;
      if (newHeroImageUrl) {
        setHeroImageUrl(newHeroImageUrl);
      }

      // Reload the page after 1 second to show updated content
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al guardar";
      toast.push({
        variant: "error",
        title: "Error",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-base grid gap-3" encType="multipart/form-data">
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
        <img src={heroImageUrl} alt="Preview hero" className="h-44 w-full object-cover" loading="lazy" />
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
  );
}
