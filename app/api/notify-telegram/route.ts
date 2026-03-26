import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order } = body;

  const lines = [
    `🛒 *Nuevo pedido* #${String(order.orderId ?? "").slice(0, 8).toUpperCase()}`,
    ``,
    `👤 *Cliente:* ${order.customerName}`,
    `📧 *Email:* ${order.customerEmail}`,
    `📱 *Teléfono:* ${order.customerPhone}`,
    ``,
    `📦 *Productos:*`,
    ...(order.items ?? []).map(
      (it: any) => `  • ${it.quantity}x ${it.name} — $${Number(it.price).toLocaleString("es-AR")}`
    ),
    ``,
    `🚚 *Envío:* ${order.shippingType === "D" ? "Domicilio" : "Sucursal"} — $${Number(order.shippingPrice).toLocaleString("es-AR")}`,
    `💰 *Total:* $${Number(order.total).toLocaleString("es-AR")}`,
    `💳 *Pago:* ${order.paymentMethod}`,
    ``,
    `📍 *Dirección:* ${order.shippingAddress}, CP ${order.postalCode}`,
    ``,
    `📅 ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba" })}`,
  ].join("\n");

  const res = await fetch(TELEGRAM_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: lines,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Telegram] Error:", err);
    return NextResponse.json({ error: "Error enviando a Telegram" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
