import { NextResponse } from "next/server";
import { webhookQuerySchema } from "@/lib/validations/payment";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function isUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured");
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch payment: ${errorBody}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const queryEntries = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = webhookQuerySchema.safeParse(queryEntries);

    if (!parsedQuery.success) {
      return NextResponse.json({ ok: true });
    }

    const query = parsedQuery.data;
    const eventType = query.type ?? query.topic;
    const paymentId = query["data.id"] ?? query.id;

    if (eventType !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true });
    }

    const payment = await getMercadoPagoPayment(paymentId);

    if (payment.status === "approved") {
      const orderId = payment.external_reference;
      if (isUuid(orderId)) {
        const supabase = getSupabaseAdminClient();

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("id, payment_status, shipping_id")
          .eq("id", orderId)
          .maybeSingle();

        if (!orderError && order) {
          if (order.payment_status !== "approved") {
            await supabase
              .from("orders")
              .update({
                payment_status: "approved",
                payment_provider: "mercadopago",
                payment_reference: String(payment.id ?? paymentId),
              })
              .eq("id", orderId);

            const { data: items } = await supabase
              .from("order_items")
              .select("product_id, quantity")
              .eq("order_id", orderId);

            for (const it of items ?? []) {
              const productId = (it as any).product_id as string;
              const qty = Number((it as any).quantity ?? 0);
              if (!productId || !Number.isFinite(qty) || qty <= 0) continue;

              const { data: product } = await supabase.from("products").select("id, stock").eq("id", productId).maybeSingle();
              const stock = Number((product as any)?.stock ?? 0);
              const next = Math.max(0, Math.floor(stock - qty));
              await supabase.from("products").update({ stock: next }).eq("id", productId);
            }
          }

          // Trigger shipping import (best-effort; import route prevents duplicates).
          if (!order.shipping_id) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
            if (baseUrl) {
              await fetch(`${baseUrl}/api/shipping/import`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ orderId }),
              }).catch(() => null);
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
