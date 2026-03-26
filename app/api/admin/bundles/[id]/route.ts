import { NextRequest, NextResponse } from "next/server";
import {
  getBundleById,
  updateBundle,
  deleteBundle,
  type BundleFormData,
} from "@/lib/services/bundles.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bundle = await getBundleById(id);
    
    if (!bundle) {
      return NextResponse.json({ error: "Bundle no encontrado" }, { status: 404 });
    }
    
    return NextResponse.json({ bundle });
  } catch (error) {
    console.error("[api:admin:bundles:id:GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el bundle" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const bundle = await updateBundle(id, formData);
    return NextResponse.json({ bundle });
  } catch (error) {
    console.error("[api:admin:bundles:id:PUT]", error);
    const message = error instanceof Error ? error.message : "Error al actualizar bundle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteBundle(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:admin:bundles:id:DELETE]", error);
    const message = error instanceof Error ? error.message : "Error al eliminar bundle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
