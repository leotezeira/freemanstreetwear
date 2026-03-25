import { NextRequest, NextResponse } from "next/server";
import {
  getShippingMethods,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  toggleShippingMethod,
  type ShippingMethod,
} from "@/lib/services/shipping-methods.service";

export async function GET() {
  try {
    const methods = await getShippingMethods();
    return NextResponse.json({ methods });
  } catch (error) {
    console.error("[api:shipping-methods:GET]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los métodos de envío" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "add": {
        const methodData: Omit<ShippingMethod, "id"> = {
          name: String(data.name ?? ""),
          type: data.type as "D" | "S",
          price: Number(data.price ?? 0),
          etaDays: data.etaDays !== null ? Number(data.etaDays) : null,
          enabled: Boolean(data.enabled ?? true),
          description: data.description ? String(data.description) : undefined,
        };

        // Validaciones básicas
        if (!methodData.name.trim()) {
          return NextResponse.json(
            { error: "El nombre es requerido" },
            { status: 400 }
          );
        }
        if (!["D", "S"].includes(methodData.type)) {
          return NextResponse.json(
            { error: "Tipo de envío inválido" },
            { status: 400 }
          );
        }
        if (methodData.price < 0) {
          return NextResponse.json(
            { error: "El precio no puede ser negativo" },
            { status: 400 }
          );
        }

        const newMethod = await addShippingMethod(methodData);
        return NextResponse.json({ method: newMethod });
      }

      case "update": {
        const id = String(data.id ?? "");
        const updates: Partial<ShippingMethod> = {};

        if (data.name !== undefined) updates.name = String(data.name);
        if (data.type === "D" || data.type === "S") updates.type = data.type;
        if (data.price !== undefined) updates.price = Number(data.price);
        if (data.etaDays !== undefined) {
          updates.etaDays = data.etaDays !== null ? Number(data.etaDays) : null;
        }
        if (data.description !== undefined) {
          updates.description = data.description ? String(data.description) : undefined;
        }
        if (data.enabled !== undefined) updates.enabled = Boolean(data.enabled);

        if (!id) {
          return NextResponse.json(
            { error: "ID de método requerido" },
            { status: 400 }
          );
        }

        const updated = await updateShippingMethod(id, updates);
        return NextResponse.json({ method: updated });
      }

      case "delete": {
        const id = String(data.id ?? "");
        if (!id) {
          return NextResponse.json(
            { error: "ID de método requerido" },
            { status: 400 }
          );
        }

        await deleteShippingMethod(id);
        return NextResponse.json({ success: true });
      }

      case "toggle": {
        const id = String(data.id ?? "");
        if (!id) {
          return NextResponse.json(
            { error: "ID de método requerido" },
            { status: 400 }
          );
        }

        const updated = await toggleShippingMethod(id);
        return NextResponse.json({ method: updated });
      }

      default:
        return NextResponse.json(
          { error: "Acción inválida" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[api:shipping-methods:POST]", error);
    const message = error instanceof Error ? error.message : "Error al procesar la solicitud";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
