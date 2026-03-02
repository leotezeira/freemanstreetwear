"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { LoaderCircle, RefreshCcw, Truck } from "lucide-react";

type Props = {
  orderId: string;
  shippingId: string | null;
  trackingNumber: string | null;
  shippingStatus: string | null;
  trackingEvents: unknown[] | null;
  canRetryImport: boolean;
};

type TrackingEvent = {
  status?: string;
  date?: string;
  location?: string;
};

export function OrderShippingActions({
  orderId,
  shippingId: shippingIdProp,
  trackingNumber: trackingNumberProp,
  shippingStatus: shippingStatusProp,
  trackingEvents: trackingEventsProp,
  canRetryImport,
}: Props) {
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingMsg, setTrackingMsg] = useState<string | null>(null);

  const [shippingId, setShippingId] = useState<string | null>(shippingIdProp);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(trackingNumberProp);
  const [shippingStatus, setShippingStatus] = useState<string | null>(shippingStatusProp);
  const [events, setEvents] = useState<TrackingEvent[]>(Array.isArray(trackingEventsProp) ? (trackingEventsProp as any) : []);

  const hasTracking = !!shippingId;

  const lastEvent = useMemo(() => (events.length ? events[events.length - 1] : null), [events]);

  async function retryImport() {
    setImportLoading(true);
    setImportMsg(null);

    try {
      const res = await fetch("/api/shipping/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, force: true }),
      });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "No se pudo importar el envío");

      setShippingId(body?.shippingId ?? null);
      setTrackingNumber(body?.trackingNumber ?? null);
      setShippingStatus(body?.shippingStatus ?? "imported");
      setImportMsg("Envío importado correctamente.");
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "No se pudo importar el envío");
    } finally {
      setImportLoading(false);
    }
  }

  async function refreshTracking() {
    if (!shippingId) return;
    setTrackingLoading(true);
    setTrackingMsg(null);

    try {
      const res = await fetch(`/api/shipping/tracking?shippingId=${encodeURIComponent(shippingId)}&force=true`);
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(body?.error ?? "No se pudo actualizar el tracking");

      setTrackingNumber(body?.trackingNumber ?? null);
      setShippingStatus(body?.status ?? null);
      setEvents(Array.isArray(body?.events) ? body.events : []);
      setTrackingMsg(body?.cached ? "Tracking actualizado (cache)." : "Tracking actualizado.");
    } catch (e) {
      setTrackingMsg(e instanceof Error ? e.message : "No se pudo actualizar el tracking");
    } finally {
      setTrackingLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-sm text-slate-700 dark:text-slate-200">
        <p>
          <span className="font-semibold">Shipping ID:</span> {shippingId ?? "—"}
        </p>
        <p>
          <span className="font-semibold">Tracking:</span> {trackingNumber ?? "—"}
        </p>
        <p>
          <span className="font-semibold">Estado:</span> {shippingStatus ?? lastEvent?.status ?? "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canRetryImport ? (
          <button className="btn-secondary" type="button" onClick={retryImport} disabled={importLoading}>
            <span className="flex items-center gap-2">
              {importLoading ? <Icon icon={LoaderCircle} className="animate-spin" /> : <Icon icon={Truck} />}
              <span>{importLoading ? "Importando..." : "Reintentar envío"}</span>
            </span>
          </button>
        ) : null}

        <button className="btn-secondary" type="button" onClick={refreshTracking} disabled={!hasTracking || trackingLoading}>
          <span className="flex items-center gap-2">
            {trackingLoading ? <Icon icon={LoaderCircle} className="animate-spin" /> : <Icon icon={RefreshCcw} />}
            <span>{trackingLoading ? "Actualizando..." : "Actualizar tracking"}</span>
          </span>
        </button>
      </div>

      {importMsg ? <p className="text-sm text-slate-600 dark:text-slate-300">{importMsg}</p> : null}
      {trackingMsg ? <p className="text-sm text-slate-600 dark:text-slate-300">{trackingMsg}</p> : null}

      {events.length ? (
        <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="text-sm font-semibold">Eventos</p>
          <div className="mt-2 space-y-2">
            {events.slice(-8).map((ev, idx) => (
              <div key={`${idx}-${ev.status ?? ""}`} className="text-sm">
                <p className="font-semibold text-slate-900 dark:text-slate-50">{ev.status ?? "Estado"}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {(ev.date ?? "").toString()} {ev.location ? `· ${ev.location}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
