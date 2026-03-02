import { NextResponse } from "next/server";
import { importShipment } from "@/lib/correo/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { shippingImportRequestSchema } from "@/lib/validations/shipping";

const MAX_WEIGHT_GRAMS = 25_000;
const MAX_DIM_CM = 150;

function isValidPostalCode(value: string) {
  const v = String(value ?? "").replace(/\s+/g, "");
  return /^\d{4}$/.test(v) || /^[A-Za-z]\d{4}[A-Za-z]{3}$/.test(v);
}

function computeParcelFromItems(items: Array<{ quantity: number; products: any }>) {
  const STD = { height: 10, width: 20, length: 20 };
  let totalWeight = 0;
  let maxWidth = 0;
  let maxLength = 0;
  let totalHeight = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
    const p = item.products ?? {};
    const w = Number(p.weight_grams ?? 0);
    if (!Number.isFinite(w) || w <= 0) continue;

    const height = Math.max(1, Math.floor(Number(p.height ?? STD.height)));
    const width = Math.max(1, Math.floor(Number(p.width ?? STD.width)));
    const length = Math.max(1, Math.floor(Number(p.length ?? STD.length)));

    totalWeight += w * qty;
    maxWidth = Math.max(maxWidth, width);
    maxLength = Math.max(maxLength, length);
    totalHeight += height * qty;
  }

  return {
    weight_grams: totalWeight,
    dimensions_cm: {
      height: Math.max(1, totalHeight || STD.height),
      width: Math.max(1, maxWidth || STD.width),
      length: Math.max(1, maxLength || STD.length),
    },
  };
}

function safeText(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function parseImportResponse(raw: unknown) {
  const shippingId = safeText((raw as any)?.shipping_id ?? (raw as any)?.shippingId ?? (raw as any)?.id);
  const trackingNumber = safeText((raw as any)?.tracking_number ?? (raw as any)?.trackingNumber ?? (raw as any)?.tracking);
  const status = safeText((raw as any)?.status ?? (raw as any)?.shipping_status);
  return { shippingId, trackingNumber, status, raw };
}

function createOrderNumber(orderId: string) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `FSW-${y}${m}${d}-${orderId.slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();

  try {
    const body = await request.json();
    const parsed = shippingImportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const { orderId } = parsed.data;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_email, customer_phone, shipping_address, postal_code, total_amount, shipping_type, shipping_agency_code, shipping_id, tracking_number, shipping_status, payment_status"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (!isValidPostalCode(order.postal_code)) {
      await supabase.from("orders").update({ shipping_status: "import_failed" }).eq("id", orderId);
      return NextResponse.json({ error: "Código postal inválido en la orden" }, { status: 400 });
    }

    if (order.payment_status !== "approved") {
      return NextResponse.json({ error: "La orden todavía no está aprobada" }, { status: 409 });
    }

    if (order.shipping_id) {
      return NextResponse.json({ error: "Esta orden ya tiene un envío importado" }, { status: 409 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("quantity, price_at_purchase, products(weight_grams, height, width, length)")
      .eq("order_id", orderId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const parcel = computeParcelFromItems((items ?? []) as any);

    if (!parcel.weight_grams || parcel.weight_grams <= 0) {
      await supabase
        .from("orders")
        .update({ shipping_status: "import_failed" })
        .eq("id", orderId);
      return NextResponse.json({ error: "No se pudo calcular el peso del envío (productos sin peso configurado)" }, { status: 400 });
    }

    if (parcel.weight_grams > MAX_WEIGHT_GRAMS) {
      await supabase.from("orders").update({ shipping_status: "import_failed" }).eq("id", orderId);
      return NextResponse.json({ error: "El peso total supera el máximo de 25kg" }, { status: 400 });
    }

    if (
      parcel.dimensions_cm.height > MAX_DIM_CM ||
      parcel.dimensions_cm.width > MAX_DIM_CM ||
      parcel.dimensions_cm.length > MAX_DIM_CM
    ) {
      await supabase.from("orders").update({ shipping_status: "import_failed" }).eq("id", orderId);
      return NextResponse.json({ error: "El paquete supera la dimensión máxima de 150cm" }, { status: 400 });
    }

    const orderNumber = order.order_number ?? createOrderNumber(order.id);
    if (!order.order_number) {
      await supabase.from("orders").update({ order_number: orderNumber }).eq("id", orderId);
    }

    const shippingType = (order.shipping_type as "D" | "S" | null) ?? null;
    if (!shippingType) {
      await supabase.from("orders").update({ shipping_status: "import_failed" }).eq("id", orderId);
      return NextResponse.json({ error: "La orden no tiene tipo de envío seleccionado" }, { status: 400 });
    }

    if (shippingType === "S" && !order.shipping_agency_code) {
      await supabase.from("orders").update({ shipping_status: "import_failed" }).eq("id", orderId);
      return NextResponse.json({ error: "Falta seleccionar sucursal para envío a sucursal" }, { status: 400 });
    }

    await supabase.from("orders").update({ shipping_status: "import_pending" }).eq("id", orderId);

    const payload = {
      customerId: process.env.CORREO_CUSTOMER_ID,
      extOrderId: order.id,
      orderNumber,
      recipient: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
      shippingAddress: {
        address: order.shipping_address,
        postalCode: order.postal_code,
      },
      declaredValue: Number(order.total_amount),
      weight_grams: parcel.weight_grams,
      dimensions_cm: parcel.dimensions_cm,
      shippingType,
      agencyCode: shippingType === "S" ? order.shipping_agency_code : null,
    };

    const raw = await importShipment(payload);
    const parsedResp = parseImportResponse(raw);

    if (!parsedResp.shippingId) {
      await supabase
        .from("orders")
        .update({ shipping_status: "import_failed" })
        .eq("id", orderId);
      return NextResponse.json({ error: "Correo no devolvió identificador de envío" }, { status: 502 });
    }

    const updatePayload = {
      shipping_id: parsedResp.shippingId,
      tracking_number: parsedResp.trackingNumber,
      shipping_status: parsedResp.status ?? "imported",
    };

    const { error: updateError } = await supabase.from("orders").update(updatePayload).eq("id", orderId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      shippingId: parsedResp.shippingId,
      trackingNumber: parsedResp.trackingNumber,
      shippingStatus: parsedResp.status ?? "imported",
    });
  } catch (error) {
    if (process.env.DEBUG_CORREO === "true") {
      console.error("[api:shipping:import]", error);
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: "No se pudo importar el envío" }, { status: 500 });
  }
}
