"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Info } from "lucide-react";

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
  orderId: _orderId,
  shippingId: shippingIdProp,
  trackingNumber: trackingNumberProp,
  shippingStatus: shippingStatusProp,
  trackingEvents: trackingEventsProp,
  canRetryImport: _canRetryImport,
}: Props) {
  const [shippingId] = useState<string | null>(shippingIdProp);
  const [trackingNumber] = useState<string | null>(trackingNumberProp);
  const [shippingStatus] = useState<string | null>(shippingStatusProp);
  const [events] = useState<TrackingEvent[]>(Array.isArray(trackingEventsProp) ? (trackingEventsProp as any) : []);

  const lastEvent = useMemo(() => (events.length ? events[events.length - 1] : null), [events]);

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

      <div className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
          <Icon icon={Info} />
          Seguimiento automático desactivado
        </p>
        <p className="mt-1">La integración automática de tracking fue removida y ya no se actualiza desde esta pantalla.</p>
      </div>

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
