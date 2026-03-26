import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Skip if credentials not configured
  if (!botToken || !chatId) {
    console.warn("[Telegram] Variables de entorno no configuradas");
    return NextResponse.json({ success: true, skipped: true });
  }

  const TELEGRAM_API = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const body = await req.json();
  const { order } = body;

  if (!order) {
    return NextResponse.json({ error: "Faltan datos del pedido" }, { status: 400 });
  }

  const shippingTypeLabel = order.shippingType === "D" ? "Domicilio" : "Sucursal";
  const shippingPriceFormatted = Number(order.shippingPrice).toLocaleString("es-AR");
  const totalFormatted = Number(order.total).toLocaleString("es-AR");
  const orderIdShort = String(order.orderId ?? "").slice(0, 8).toUpperCase();
  const dateStr = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba" });

  const itemsText = (order.items ?? [])
    .map((it: any) => {
      const variantInfo = [];
      if (it.size) variantInfo.push(`Talle: ${it.size}`);
      if (it.color) variantInfo.push(`Color: ${it.color}`);
      const variantStr = variantInfo.length > 0 ? ` (${variantInfo.join(', ')})` : '';
      return `  - ${it.quantity}x ${it.name}${variantStr} - $${Number(it.price).toLocaleString("es-AR")}`;
    })
    .join("\n");

  const message = [
    `🛒 *NUEVO PEDIDO* #${orderIdShort}`,
    "",
    `👤 *Cliente:* ${order.customerName}`,
    `📧 *Email:* ${order.customerEmail}`,
    `📱 *Teléfono:* ${order.customerPhone}`,
    "",
    `📦 *PRODUCTOS:*`,
    itemsText || "  (sin productos)",
    "",
    `🚚 *Envío:* ${shippingTypeLabel} - $${shippingPriceFormatted}`,
    `💰 *TOTAL:* $${totalFormatted}`,
    `💳 *Pago:* ${order.paymentMethod}`,
    "",
    `📍 *Direccion:* ${order.shippingAddress}, CP ${order.postalCode}`,
    "",
    `📅 ${dateStr}`,
  ].join("\n");

  try {
    const res = await fetch(TELEGRAM_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Telegram] API error:", errText);
      return NextResponse.json({ error: "Error enviando a Telegram" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Telegram] Exception:", error);
    return NextResponse.json({ error: "Error enviando a Telegram" }, { status: 500 });
  }
}
