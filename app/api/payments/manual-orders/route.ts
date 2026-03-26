import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPreferenceSchema.safeParse(body);

    if (!parsed.success) {
      const msg = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(", ")}`)
        .join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { customer, items } = parsed.data;
    const paymentMethodId: string = (body as any).paymentMethodId ?? "transfer";

    // Validar que el método exista y esté activo
    const supabase = getSupabaseAdminClient();
    const { data: contentRow } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "payment_methods")
      .maybeSingle();

    const allMethods = (contentRow?.value as any[]) ?? [];
    const method = allMethods.find((m) => m.id === paymentMethodId && m.enabled);
    if (!method) {
      return NextResponse.json(
        { error: "Método de pago no disponible" },
        { status: 400 }
      );
    }

    const orderItems: Array<{
      productId: string;
      quantity: number;
      priceAtPurchase: number;
      productName: string;
    }> = [];

    for (const item of items) {
      const product = await getProductById(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: "Producto no encontrado", productId: item.productId },
          { status: 404 }
        );
      }
      if (product.stock <= 0) {
        return NextResponse.json(
          { error: "Producto sin stock", productId: item.productId },
          { status: 409 }
        );
      }
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtPurchase: Number(product.price),
        productName: product.name,
      });
    }

    const shippingPrice = Number(parsed.data.shipping.price);
    const subtotal = orderItems.reduce(
      (sum, it) => sum + it.priceAtPurchase * it.quantity,
      0
    );
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
      shippingAgencyCode:
        parsed.data.shipping.type === "S"
          ? (parsed.data.shipping.agencyCode ?? null)
          : null,
      paymentStatus: "pending",
      items: orderItems.map(({ productName: _name, ...rest }) => rest),
    });

    // Actualizar payment_method y order_number en la orden
    const orderNumber = createOrderNumber();
    await supabase
      .from("orders")
      .update({
        payment_method: paymentMethodId,
        payment_provider: method.label,
        order_number: orderNumber,
      })
      .eq("id", order.id);

    // Notificación Telegram — no bloquea si falla
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notify-telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            orderId: order.id,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            shippingAddress: customer.shippingAddress,
            postalCode: customer.postalCode,
            shippingType: parsed.data.shipping.type,
            shippingPrice,
            total,
            paymentMethod: method.label,
            items: orderItems.map((it) => ({
              name: it.productName,
              quantity: it.quantity,
              price: it.priceAtPurchase,
            })),
          },
        }),
      });
    } catch (e) {
      console.error("[Telegram] No se pudo notificar:", e);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber,
      instructions: method.instructions ?? "",
      methodLabel: method.label,
      total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}