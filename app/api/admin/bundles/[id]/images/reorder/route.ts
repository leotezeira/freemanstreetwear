// =====================================================
// API: PATCH /api/admin/bundles/[id]/images/reorder
// Actualiza el orden de las imágenes de un bundle
// =====================================================

import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bundleId } = await context.params;
    const body = await request.json().catch(() => null);

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 });
    }

    const { order }: { order: string[] } = body ?? { order: [] };
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: "Invalid order format" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Actualizar sort_order para cada imagen
    const updates = order.map((imageId, index) => ({
      id: imageId,
      sort_order: index,
    }));

    const { error } = await supabase
      .from("bundle_images")
      .upsert(updates);

    if (error) {
      console.error("[PATCH /api/admin/bundles/[id]/images/reorder] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bundles/[id]/images/reorder] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
