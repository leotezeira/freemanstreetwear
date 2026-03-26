import { NextRequest, NextResponse } from "next/server";
import {
  getBundles,
  createBundle,
} from "@/lib/services/bundles.service";
import type { BundleFormData } from "@/types/bundle";

export async function GET() {
  try {
    const bundles = await getBundles();
    return NextResponse.json({ bundles });
  } catch (error) {
    console.error("[api:admin:bundles:GET]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los bundles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const formData: BundleFormData = {
      name: String(body.name ?? ""),
      description: body.description ?? undefined,
      slug: body.slug ?? undefined,
      price: Number(body.price ?? 0),
      compare_at_price: body.compare_at_price !== undefined ? Number(body.compare_at_price) : undefined,
      is_active: Boolean(body.is_active ?? true),
      image_path: body.image_path ?? null,
      items: Array.isArray(body.items) ? body.items.map((item: any) => ({
        product_id: String(item.product_id),
        variant_id: item.variant_id ?? null,
        quantity: Number(item.quantity ?? 1),
      })) : [],
    };

    const bundle = await createBundle(formData);
    return NextResponse.json({ bundle });
  } catch (error) {
    console.error("[api:admin:bundles:POST]", error);
    const message = error instanceof Error ? error.message : "Error al crear bundle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
