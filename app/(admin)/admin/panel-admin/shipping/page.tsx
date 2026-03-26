"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { Plus, Trash2, ToggleLeft, ToggleRight, Truck, Package } from "lucide-react";

type ShippingMethod = {
  id: string;
  name: string;
  type: "D" | "S";
  price: number;
  etaDays: number | null;
  enabled: boolean;
  description?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}

export default function AdminShippingPage() {
  const toast = useToast();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [newMethod, setNewMethod] = useState({
    name: "",
    type: "D" as "D" | "S",
    price: "",
    etaDays: "",
    description: "",
  });

  useEffect(() => {
    void loadMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMethods() {
    setLoading(true);
    try {
      const res = await fetch("/api/shipping-methods");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al cargar");
      setMethods(body.methods ?? []);
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudieron cargar los métodos",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMethod() {
    setSaving(true);
    try {
      const res = await fetch("/api/shipping-methods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add",
          name: newMethod.name,
          type: newMethod.type,
          price: Number(newMethod.price) || 0,
          etaDays: newMethod.etaDays ? Number(newMethod.etaDays) : null,
          description: newMethod.description || undefined,
          enabled: true,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al guardar");

      toast.push({
        variant: "success",
        title: "Método agregado",
        description: "El nuevo método de envío fue creado exitosamente.",
      });

      setNewMethod({ name: "", type: "D", price: "", etaDays: "", description: "" });
      setShowForm(false);
      await loadMethods();
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo agregar el método",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      const res = await fetch("/api/shipping-methods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "toggle", id }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al actualizar");

      setMethods((prev) =>
        prev.map((m) => (m.id === id ? { ...m, enabled: body.method.enabled } : m))
      );

      toast.push({
        variant: "success",
        title: "Actualizado",
        description: body.method.enabled ? "Método activado" : "Método desactivado",
      });
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo actualizar el método",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este método de envío?")) return;

    try {
      const res = await fetch("/api/shipping-methods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al eliminar");

      setMethods((prev) => prev.filter((m) => m.id !== id));

      toast.push({
        variant: "success",
        title: "Eliminado",
        description: "El método de envío fue eliminado.",
      });
    } catch (e) {
      toast.push({
        variant: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo eliminar el método",
      });
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Envíos</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Gestioná los métodos de envío disponibles en el checkout.
          </p>
        </div>
        <button className="btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
          <span className="flex items-center gap-2">
            <Icon icon={Plus} />
            <span>Agregar método</span>
          </span>
        </button>
      </div>

      {/* Formulario para agregar nuevo método */}
      {showForm && (
        <div className="card-base grid gap-4 md:max-w-xl">
          <h2 className="text-lg font-bold">Nuevo método de envío</h2>

          <div className="grid gap-3">
            <label className="text-sm font-semibold">Nombre</label>
            <input
              className="input-base"
              type="text"
              placeholder="Ej: Envío express"
              value={newMethod.name}
              onChange={(e) => setNewMethod((p) => ({ ...p, name: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">Tipo</label>
                <select
                  className="input-base"
                  value={newMethod.type}
                  onChange={(e) => setNewMethod((p) => ({ ...p, type: e.target.value as "D" | "S" }))}
                >
                  <option value="D">Domicilio</option>
                  <option value="S">Sucursal</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">Precio (ARS)</label>
                <input
                  className="input-base"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="0"
                  value={newMethod.price}
                  onChange={(e) => setNewMethod((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Días estimados (opcional)</label>
              <input
                className="input-base"
                type="number"
                min={0}
                step={1}
                placeholder="Ej: 3"
                value={newMethod.etaDays}
                onChange={(e) => setNewMethod((p) => ({ ...p, etaDays: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Descripción (opcional)</label>
              <textarea
                className="input-base"
                rows={2}
                placeholder="Descripción breve del método de envío..."
                value={newMethod.description}
                onChange={(e) => setNewMethod((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-primary"
              type="button"
              onClick={handleAddMethod}
              disabled={saving || !newMethod.name.trim()}
            >
              Guardar
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewMethod({ name: "", type: "D", price: "", etaDays: "", description: "" });
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de métodos */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Métodos configurados</h2>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
            ))}
          </div>
        ) : methods.length === 0 ? (
          <div className="card-base">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No hay métodos de envío configurados.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`card-base flex items-center justify-between gap-4 ${
                  !method.enabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      method.type === "D"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                    }`}
                  >
                    <Icon icon={method.type === "D" ? Truck : Package} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-50">{method.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {method.type === "D" ? "Domicilio" : "Sucursal"}
                      {method.description && ` · ${method.description}`}
                      {typeof method.etaDays === "number" && ` · ${method.etaDays} días`}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {formatMoney(method.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(method.id)}
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    title={method.enabled ? "Desactivar" : "Activar"}
                  >
                    <Icon
                      icon={method.enabled ? ToggleRight : ToggleLeft}
                      className={`h-6 w-6 ${
                        method.enabled
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(method.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                    title="Eliminar"
                  >
                    <Icon icon={Trash2} className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
