import { NextResponse } from "next/server";
import { getTracking } from "@/lib/correo/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { shippingTrackingQuerySchema } from "@/lib/validations/shipping";

const TRACKING_REVALIDATE_MS = 6 * 60 * 60_000;

function normalizeTrackingResponse(raw: unknown) {
  const eventsCandidate = (raw as any)?.events ?? (raw as any)?.data ?? (raw as any)?.tracking ?? (Array.isArray(raw) ? raw : null);
  const eventsList: any[] = Array.isArray(eventsCandidate) ? eventsCandidate : [];

  const events = eventsList
    .map((e) => {
      const status = String(e?.status ?? e?.state ?? e?.descripcion ?? e?.description ?? "").trim();
      const date = String(e?.date ?? e?.timestamp ?? e?.fecha ?? "").trim();
      const location = String(e?.location ?? e?.localidad ?? e?.place ?? "").trim();

      if (!status && !date) return null;
      return { status, date, location };
    })
    .filter(Boolean);

  const last = events.length ? events[events.length - 1] : null;
  const currentStatus =
    String((raw as any)?.status ?? (raw as any)?.currentStatus ?? last?.status ?? "").trim() || null;

  const trackingNumber = String((raw as any)?.tracking_number ?? (raw as any)?.trackingNumber ?? "").trim() || null;

  return { events, currentStatus, trackingNumber };
}

export async function GET(request: Request) {
  const supabase = getSupabaseAdminClient();

  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const parsed = shippingTrackingQuerySchema.safeParse(query);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
    }

    const shippingId = parsed.data.shippingId;
    const force = parsed.data.force === true;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, shipping_id, tracking_number, shipping_status, tracking_events, last_tracking_sync_at")
      .eq("shipping_id", shippingId)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Envío no encontrado" }, { status: 404 });
    }

    const lastSync = order.last_tracking_sync_at ? new Date(order.last_tracking_sync_at).getTime() : 0;
    const isFresh = lastSync && Date.now() - lastSync < TRACKING_REVALIDATE_MS;

    if (!force && isFresh) {
      return NextResponse.json({
        shippingId,
        trackingNumber: order.tracking_number ?? null,
        status: order.shipping_status ?? null,
        events: Array.isArray(order.tracking_events) ? order.tracking_events : [],
        cached: true,
      });
    }

    const raw = await getTracking({ shippingId });
    const normalized = normalizeTrackingResponse(raw);

    const updatePayload = {
      shipping_status: normalized.currentStatus ?? order.shipping_status ?? null,
      tracking_number: normalized.trackingNumber ?? order.tracking_number ?? null,
      tracking_events: normalized.events,
      last_tracking_sync_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from("orders").update(updatePayload).eq("id", order.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      shippingId,
      trackingNumber: updatePayload.tracking_number,
      status: updatePayload.shipping_status,
      events: normalized.events,
      cached: false,
    });
  } catch (error) {
    if (process.env.DEBUG_CORREO === "true") {
      console.error("[api:shipping:tracking]", error);
    }
    return NextResponse.json({ error: "No se pudo consultar el tracking" }, { status: 500 });
  }
}
