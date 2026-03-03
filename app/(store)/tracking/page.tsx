"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { Info, Truck } from "lucide-react";

export default function TrackingPage() {
  const toast = useToast();

  const [shippingId, setShippingId] = useState("");

  async function search() {
    try {
      if (!shippingId.trim()) {
        throw new Error("Ingresá un identificador de envío");
      }

      toast.push({
        variant: "error",
        title: "Tracking no disponible",
        description: "La integración automática de seguimiento está desactivada.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo procesar la solicitud";
      toast.push({ variant: "error", title: "Tracking", description: msg });
    }
  }

  return (
    <main className="app-container py-10">
      <div className="flex items-center gap-3">
        <span className="text-slate-700 dark:text-slate-200">
          <Icon icon={Truck} />
        </span>
        <h1 className="text-3xl font-black tracking-tight">Seguimiento</h1>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="card-base space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">Ingresá tu Shipping ID para consultar con soporte.</p>
          <input className="input-base" value={shippingId} onChange={(e) => setShippingId(e.target.value)} placeholder="Shipping ID" />
          <button className="btn-primary" type="button" onClick={search} disabled={!shippingId.trim()}>
            <span className="flex items-center justify-center gap-2">
              <Icon icon={Info} />
              <span>Ver información</span>
            </span>
          </button>
        </div>

        <div className="card-base">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Seguimiento automático desactivado</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Por cambios en logística, el seguimiento online ya no está disponible en este sitio.
              Si necesitás ayuda con un envío, contactanos por los canales de soporte con tu identificador.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
