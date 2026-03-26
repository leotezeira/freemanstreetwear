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
    if (!confirm("¿Estás seguro de eliminar este bundle? Esta acción no se puede deshacer.")) return;

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
          <p className="text-slate-600 dark:text-slate-300">
            Creá combos de productos con precios especiales.
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => router.push("/admin/panel-admin/bundles/new")}
        >
          <span className="flex items-center gap-2">
            <Icon icon={Plus} />
            <span>Crear Bundle</span>
          </span>
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <div className="card-base text-center py-12">
          <Icon icon={Package2} className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-50">
            No hay bundles creados
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Creá tu primer bundle para ofrecer combos con descuento
          </p>
          <button
            className="btn-primary mt-4"
            type="button"
            onClick={() => router.push("/admin/panel-admin/bundles/new")}
          >
            Crear Bundle
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`card-base space-y-3 ${!bundle.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 truncate">
                    {bundle.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {bundle.description ?? "Sin descripción"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(bundle.id)}
                  className="shrink-0"
                  title={bundle.is_active ? "Desactivar" : "Activar"}
                >
                  <Icon
                    icon={bundle.is_active ? ToggleRight : ToggleLeft}
                    className={`h-6 w-6 ${
                      bundle.is_active
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  />
                </button>
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

              {bundle.compare_at_price && bundle.compare_at_price > bundle.price && (
                <div className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  Ahorrás {formatMoney(bundle.compare_at_price - bundle.price)}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/panel-admin/bundles/${bundle.id}`)}
                  className="btn-secondary flex-1 text-xs"
                >
                  <span className="flex items-center justify-center gap-1">
                    <Icon icon={Pencil} className="h-3 w-3" />
                    Editar
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(bundle.id)}
                  className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Eliminar"
                >
                  <Icon icon={Trash2} className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
