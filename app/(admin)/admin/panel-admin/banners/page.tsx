"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, ToggleLeft, ToggleRight, Trash2, Upload } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { ClientImage } from "@/components/ui/client-image";
import { useToast } from "@/components/ui/toast";

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_path: string;
  sort_order: number;
  is_active: boolean;
  signed_url?: string | null;
};

export default function AdminBannersPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    cta_label: "",
    cta_href: "",
  });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hero-banners");
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "Error");

      setBanners(Array.isArray(body?.banners) ? body.banners : []);
      setIntervalMs(Number(body?.settings?.interval_ms ?? 5000));
    } catch {
      toast.push({ variant: "error", title: "Error", description: "No se pudieron cargar los banners" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(file: File) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("action", "create");
      fd.set("image", file);
      fd.set("title", form.title);
      fd.set("subtitle", form.subtitle);
      fd.set("cta_label", form.cta_label);
      fd.set("cta_href", form.cta_href);

      const res = await fetch("/api/admin/hero-banners", { method: "POST", body: fd });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "Error");

      toast.push({ variant: "success", title: "Banner creado" });
      setForm({ title: "", subtitle: "", cta_label: "", cta_href: "" });
      setShowForm(false);
      await load();
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo crear el banner",
      });
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      if (!res.ok) throw new Error();
      setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, is_active: !current } : b)));
    } catch {
      toast.push({ variant: "error", title: "Error al actualizar" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este banner?")) return;
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBanners((prev) => prev.filter((b) => b.id !== id));
      toast.push({ variant: "success", title: "Banner eliminado" });
    } catch {
      toast.push({ variant: "error", title: "Error al eliminar" });
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("action", "settings");
      fd.set("interval_ms", String(intervalMs));
      const res = await fetch("/api/admin/hero-banners", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      toast.push({ variant: "success", title: "Configuracion guardada" });
    } catch {
      toast.push({ variant: "error", title: "Error al guardar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Banners Hero</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona los banners del carrusel principal de la landing.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">
          <Icon icon={Upload} className="h-4 w-4" />
          Nuevo banner
        </button>
      </div>

      <div className="card-base flex flex-wrap items-end gap-4">
        <Icon icon={Settings} className="mt-1 h-5 w-5 text-slate-500" />
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-sm font-semibold">Duracion por banner (ms)</label>
          <input
            type="number"
            min={2000}
            max={30000}
            step={500}
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="input-base"
          />
          <p className="mt-1 text-xs text-slate-500">
            {(intervalMs / 1000).toFixed(1)}s (min 2s, max 30s)
          </p>
        </div>
        <button type="button" onClick={handleSaveSettings} disabled={saving} className="btn-secondary">
          Guardar
        </button>
      </div>

      {showForm ? (
        <div className="card-base space-y-4">
          <h2 className="text-lg font-bold">Nuevo Banner</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Titulo</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="input-base"
                placeholder="Streetwear para todos los dias"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Subtitulo</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                className="input-base"
                placeholder="Nueva coleccion disponible"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Texto del boton</label>
              <input
                type="text"
                value={form.cta_label}
                onChange={(e) => setForm((p) => ({ ...p, cta_label: e.target.value }))}
                className="input-base"
                placeholder="Ver coleccion"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Link del boton</label>
              <input
                type="text"
                value={form.cta_href}
                onChange={(e) => setForm((p) => ({ ...p, cta_href: e.target.value }))}
                className="input-base"
                placeholder="/shop"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Imagen <span className="text-slate-500">(JPG/PNG/WEBP, max 5MB, recomendado 1920x600)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCreate(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={saving}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Icon icon={Upload} className="h-4 w-4" />
              {saving ? "Subiendo..." : "Seleccionar imagen y crear banner"}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="card-base py-12 text-center">
          <p className="text-slate-500">No hay banners todavia. Crea el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`card-base flex items-center gap-4 ${!banner.is_active ? "opacity-60" : ""}`}
            >
              <div className="h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                <ClientImage
                  src={banner.signed_url ?? null}
                  alt={banner.title ?? "Banner"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900 dark:text-slate-50">
                  {banner.title ?? "Sin titulo"}
                </p>
                {banner.subtitle ? <p className="truncate text-sm text-slate-500">{banner.subtitle}</p> : null}
                {banner.cta_href ? <p className="mt-0.5 text-xs text-slate-400">-&gt; {banner.cta_href}</p> : null}
              </div>

              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                  banner.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {banner.is_active ? "Activo" : "Inactivo"}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleToggle(banner.id, banner.is_active)}
                  className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title={banner.is_active ? "Desactivar" : "Activar"}
                >
                  <Icon
                    icon={banner.is_active ? ToggleRight : ToggleLeft}
                    className={["h-5 w-5", banner.is_active ? "text-emerald-600" : "text-slate-400"].join(" ")}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(banner.id)}
                  className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30"
                  title="Eliminar"
                >
                  <Icon icon={Trash2} className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

