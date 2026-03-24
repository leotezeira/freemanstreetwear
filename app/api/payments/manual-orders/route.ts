import { NextResponse } from "next/server";
import { createPreferenceSchema } from "@/lib/validations/payment";
import { getProductById } from "@/lib/services/products.service";
import { createOrderWithItems } from "@/lib/services/orders.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
      });
    }

    const shippingPrice = Number(parsed.data.shipping.price);
    const subtotal = orderItems.reduce(
      (sum, it) => sum + it.priceAtPurchase * it.quantity,
      0
    );

    const order = await createOrderWithItems({
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      shippingAddress: customer.shippingAddress,
      postalCode: customer.postalCode,
      totalAmount: subtotal + shippingPrice,
      shippingAmount: shippingPrice,
      shippingType: parsed.data.shipping.type,
      shippingPrice,
      shippingAgencyCode:
        parsed.data.shipping.type === "S"
          ? (parsed.data.shipping.agencyCode ?? null)
          : null,
      paymentStatus: "pending",
      items: orderItems,
    });

    // Actualizar payment_method en la orden
    await supabase
      .from("orders")
      .update({
        payment_method: paymentMethodId,
        payment_provider: method.label,
      })
      .eq("id", order.id);

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      instructions: method.instructions ?? "",
      methodLabel: method.label,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}