"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { LoaderCircle, Search, Truck } from "lucide-react";

type TrackingEvent = {
  status?: string;
  date?: string;
  location?: string;
};

export default function TrackingPage() {
  const toast = useToast();

  const [shippingId, setShippingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);

  const canSearch = useMemo(() => shippingId.trim().length >= 6, [shippingId]);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/shipping/tracking?shippingId=${encodeURIComponent(shippingId.trim())}`);
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "No se pudo consultar el tracking");

      setStatus(body?.status ?? null);
      setTrackingNumber(body?.trackingNumber ?? null);
      setEvents(Array.isArray(body?.events) ? body.events : []);

      toast.push({ variant: "success", title: "Tracking cargado" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo consultar el tracking";
      toast.push({ variant: "error", title: "Tracking", description: msg });
    } finally {
      setLoading(false);
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
          <p className="text-sm text-slate-600 dark:text-slate-300">Ingresá tu Shipping ID para ver el estado del envío.</p>
          <input className="input-base" value={shippingId} onChange={(e) => setShippingId(e.target.value)} placeholder="Shipping ID" />
          <button className="btn-primary" type="button" onClick={search} disabled={!canSearch || loading}>
            <span className="flex items-center justify-center gap-2">
              {loading ? <Icon icon={LoaderCircle} className="animate-spin" /> : <Icon icon={Search} />}
              <span>{loading ? "Buscando..." : "Buscar"}</span>
            </span>
          </button>
        </div>

        <div className="card-base">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Estado</p>
              <p className="text-lg font-bold">{status ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Tracking</p>
              <p className="text-sm font-semibold">{trackingNumber ?? "—"}</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2">
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
            </div>
          ) : null}

          {!loading && events.length ? (
            <div className="mt-4 space-y-3">
              {events.slice().reverse().slice(0, 10).map((ev, idx) => (
                <div key={`${idx}-${ev.status ?? ""}`} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{ev.status ?? "Evento"}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {(ev.date ?? "").toString()} {ev.location ? `· ${ev.location}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : !loading ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Aún no hay eventos para mostrar.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
