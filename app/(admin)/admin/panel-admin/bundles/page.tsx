// =====================================================
// ADMIN: /admin/panel-admin/bundles
// Lista todos los bundles (activos e inactivos)
// =====================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Package2 } from "lucide-react";
import type { BundleWithItems } from "@/types/bundle";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

export default function AdminBundlesPage() {
  const router = useRouter();
  const toast = useToast();
  const [bundles, setBundles] = useState<BundleWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadBundles();
  }, []);

  async function loadBundles() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bundles");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar");
      setBundles(body.bundles ?? []);
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudieron cargar los bundles",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      const res = await fetch(`/api/admin/bundles/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !bundles.find((b) => b.id === id)?.is_active }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      setBundles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: !b.is_active } : b))
      );

      toast.push({
        variant: "success",
        title: "Actualizado",
        description: "El estado del bundle fue actualizado",
      });
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo actualizar el bundle",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este bundle?")) return;

    try {
      const res = await fetch(`/api/admin/bundles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");

      setBundles((prev) => prev.filter((b) => b.id !== id));

      toast.push({
        variant: "success",
        title: "Eliminado",
        description: "El bundle fue eliminado",
      });
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo eliminar el bundle",
      });
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Bundles</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestioná los packs de productos
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/panel-admin/bundles/new")}
          className="btn-primary flex items-center gap-2"
        >
          <Icon icon={Plus} className="h-4 w-4" />
          Nuevo Bundle
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-base h-48 animate-pulse" />
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <div className="card-base p-8 text-center">
          <Icon icon={Package2} className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-bold">No hay bundles</h3>
          <p className="text-slate-600 dark:text-slate-400">
            Creá tu primer bundle para comenzar
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <div key={bundle.id} className="card-base space-y-3">
              <div className="aspect-video overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                {bundle.image_path ? (
                  <img src={bundle.image_path} alt={bundle.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Icon icon={Package2} className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-50">{bundle.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      bundle.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {bundle.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {bundle.description ?? "Sin descripción"}
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {formatMoney(bundle.price)}
                </span>
                {bundle.compare_at_price && (
                  <span className="text-sm line-through text-slate-400">
                    {formatMoney(bundle.compare_at_price)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {bundle.bundle_items.length} productos · {bundle.required_quantity} a elegir
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(bundle.id)}
                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={bundle.is_active ? "Desactivar" : "Activar"}
                  >
                    <Icon
                      icon={bundle.is_active ? ToggleRight : ToggleLeft}
                      className={`h-5 w-5 ${
                        bundle.is_active
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/panel-admin/bundles/${bundle.id}`)}
                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Editar"
                  >
                    <Icon icon={Pencil} className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(bundle.id)}
                    className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Eliminar"
                  >
                    <Icon icon={Trash2} className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
