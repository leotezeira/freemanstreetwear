import { NextResponse } from "next/server";
import { createMercadoPagoPreference } from "@/lib/services/payments.service";
import { createPreferenceSchema } from "@/lib/validations/payment";
import { getProductById } from "@/lib/services/products.service";
import { createOrderWithItems } from "@/lib/services/orders.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function createOrderNumber(orderId: string) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `FSW-${y}${m}${d}-${orderId.slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPreferenceSchema.safeParse(body);

    if (!parsed.success) {
      const flat = parsed.error.flatten();
      // create a short string summarizing the problem so the client doesn't have to inspect
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

    // Set human-friendly order number after we have a UUID.
    const orderNumber = createOrderNumber(order.id);
    // Best-effort; ignore if DB isn't migrated.
    try {
      await getSupabaseAdminClient().from("orders").update({ order_number: orderNumber }).eq("id", order.id);
    } catch {
      // ignore
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
