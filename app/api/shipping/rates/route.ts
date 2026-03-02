import { NextResponse } from "next/server";
import { getCorreoRates } from "@/lib/correo";

type DeliveryType = "branch" | "home";

type CartItem = {
  weight_grams?: number;
  height?: number;
  width?: number;
  length?: number;
  quantity?: number;
};

type ShippingRatesRequest = {
  zipCode: string;
  deliveryType?: DeliveryType;
  cartItems?: CartItem[];
};

const DEFAULT_PRICE_BY_DELIVERY_TYPE: Record<DeliveryType, number> = {
  branch: 6000,
  home: 7500,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRequest(body: unknown): { ok: true; data: Required<ShippingRatesRequest> } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Body inválido: se esperaba un objeto JSON." };
  }

  const zipCodeRaw = body.zipCode;
  const deliveryTypeRaw = body.deliveryType;
  const cartItemsRaw = body.cartItems;

  if (typeof zipCodeRaw !== "string" || zipCodeRaw.trim().length === 0) {
    return { ok: false, error: "zipCode es requerido y debe ser string." };
  }

  const zipCode = zipCodeRaw.trim();

  let deliveryType: DeliveryType = "home";
  if (typeof deliveryTypeRaw !== "undefined") {
    if (deliveryTypeRaw !== "branch" && deliveryTypeRaw !== "home") {
      return { ok: false, error: 'deliveryType debe ser "branch" o "home".' };
    }
    deliveryType = deliveryTypeRaw;
  }

  const cartItems = Array.isArray(cartItemsRaw) ? (cartItemsRaw as CartItem[]) : undefined;

  return { ok: true, data: { zipCode, deliveryType, cartItems } };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = normalizeRequest(body);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { zipCode, deliveryType, cartItems } = parsed.data;

    let price = DEFAULT_PRICE_BY_DELIVERY_TYPE[deliveryType];
    let estimatedDays = "3-6";

    if (cartItems && cartItems.length > 0) {
      try {
        const rates = await getCorreoRates({ zipCode, cartItems });
        const serviceType = deliveryType === "home" ? "D" : "S";
        const calculatedPrice = rates.priceByType[serviceType];

        if (calculatedPrice !== null && Number.isFinite(calculatedPrice)) {
          price = calculatedPrice;
          const eta = rates.etaByType[serviceType];
          if (eta) {
            estimatedDays = eta;
          }
        }
      } catch (error) {
        console.error("[api:shipping:rates] Error calculating real rates, using defaults", error);
      }
    }

    return NextResponse.json(
      {
        price,
        currency: "ARS",
        deliveryType,
        estimatedDays,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api:shipping:rates]", error);
    return NextResponse.json({ error: "No se pudo calcular el envío." }, { status: 500 });
  }
}
