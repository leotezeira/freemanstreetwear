import { NextResponse } from "next/server";
import { createMercadoPagoPreference } from "@/lib/services/payments.service";
import { createPreferenceSchema } from "@/lib/validations/payment";
import { getProductById } from "@/lib/services/products.service";
import { createOrderWithItems } from "@/lib/services/orders.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

let orderCounter = 340;

function createOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const num = String(orderCounter++).padStart(4, "0");
  return `FSW-${y}${m}${d}-${num}`;
}

async function sendOrderNotificationEmail(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  postalCode: string;
  orderNumber: string;
  total: number;
  shippingPrice: number;
  orderItems: Array<{ productId: string; quantity: number; priceAtPurchase: number; productName: string }>;
}) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.warn("[EmailJS] Faltan variables de entorno, se omite el envío de email.");
    return;
  }

  const emailjs = await import("@emailjs/nodejs");

  // ✅ API correcta para @emailjs/nodejs v5
  emailjs.init({ publicKey, privateKey });

  const itemsText = params.orderItems
    .map(
      (item) =>
        `• ${item.quantity}x ${item.productName} — $${item.priceAtPurchase.toLocaleString("es-AR")} c/u`
    )
    .join("\n");

  const totalItems = params.orderItems.reduce((sum, i) => sum + i.quantity, 0);

  await emailjs.send(serviceId, templateId, {
    name: params.customerName,
    nombre: params.customerName,
    email: params.customerEmail,
    telefono: params.customerPhone,
    producto: itemsText,
    cantidad: String(totalItems),
    total: `$${params.total.toLocaleString("es-AR")}`,
    mensaje: [
      `Orden: ${params.orderNumber}`,
      `Dirección: ${params.shippingAddress}, CP ${params.postalCode}`,
      `Envío: $${params.shippingPrice.toLocaleString("es-AR")}`,
    ].join(" | "),
    time: new Date().toLocaleString("es-AR"),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPreferenceSchema.safeParse(body);

    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const msg = Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(", ")}`)
        .join("; ");
      return NextResponse.json({ error: "Invalid payload", message: msg, details: flat }, { status: 400 });
    }

    const { customer, items } = parsed.data;
    const preferenceItems: Array<{ title: string; quantity: number; unit_price: number }> = [];

    if (parsed.data.shipping.type === "S" && !parsed.data.shipping.agencyCode) {
      return NextResponse.json({ error: "Falta seleccionar sucursal" }, { status: 400 });
    }

    const orderItems: Array<{ productId: string; quantity: number; priceAtPurchase: number }> = [];
    const orderItemsWithNames: Array<{ productId: string; quantity: number; priceAtPurchase: number; productName: string }> = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await getProductById(item.productId);

      if (!product) {
        return NextResponse.json({ error: "Product not found", productId: item.productId }, { status: 404 });
      }

      if (product.stock <= 0) {
        return NextResponse.json(
          { error: "Product unavailable", productId: item.productId },
          { status: 409 }
        );
      }

      if (item.quantity > product.stock) {
        return NextResponse.json(
          { error: "Insufficient stock", productId: item.productId },
          { status: 409 }
        );
      }

      preferenceItems.push({
        title: product.name,
        quantity: item.quantity,
        unit_price: Number(product.price),
      });

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtPurchase: Number(product.price),
      });

      orderItemsWithNames.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtPurchase: Number(product.price),
        productName: product.name,
      });

      subtotal += Number(product.price) * item.quantity;
    }

    const shippingPrice = Number(parsed.data.shipping.price);
    if (!Number.isFinite(shippingPrice) || shippingPrice < 0) {
      return NextResponse.json({ error: "Precio de envío inválido" }, { status: 400 });
    }

    if (shippingPrice > 0) {
      preferenceItems.push({ title: "Envío", quantity: 1, unit_price: shippingPrice });
    }

    const total = subtotal + shippingPrice;

    const order = await createOrderWithItems({
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      shippingAddress: customer.shippingAddress,
      postalCode: customer.postalCode,
      totalAmount: total,
      shippingAmount: shippingPrice,
      shippingType: parsed.data.shipping.type,
      shippingPrice,
      shippingAgencyCode: parsed.data.shipping.type === "S" ? (parsed.data.shipping.agencyCode ?? null) : null,
      paymentStatus: "pending",
      items: orderItems,
    });

    if (!order) {
      return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 });
    }

    // Set human-friendly order number
    const orderNumber = createOrderNumber();
    try {
      await getSupabaseAdminClient().from("orders").update({ order_number: orderNumber }).eq("id", order.id);
    } catch {
      // ignore
    }

    // Enviar email de notificación — no bloquea el flujo de pago si falla.
    try {
      await sendOrderNotificationEmail({
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        shippingAddress: customer.shippingAddress,
        postalCode: customer.postalCode,
        orderNumber,
        total,
        shippingPrice,
        orderItems: orderItemsWithNames,
      });
    } catch (emailError) {
      console.error("[EmailJS] Error al enviar notificación de pedido:", emailError);
      // No lanzamos el error — el pedido ya fue creado y el pago debe continuar.
    }

    const preference = await createMercadoPagoPreference({
      items: preferenceItems,
      payer: {
        name: customer.name,
        email: customer.email,
      },
      externalReference: order.id,
    });

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
