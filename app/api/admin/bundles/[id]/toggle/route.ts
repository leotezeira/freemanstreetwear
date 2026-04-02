// =====================================================
// API: PATCH /api/admin/bundles/[id]/toggle
// Cambia el estado activo/inactivo de un bundle
// =====================================================

import { NextResponse } from "next/server";
import { toggleBundleActive } from "@/lib/services/bundles.service";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing bundle id" }, { status: 400 });
    }

    const bundle = await toggleBundleActive(id);

    return NextResponse.json({ bundle });
  } catch (error) {
    console.error("[PATCH /api/admin/bundles/[id]/toggle] Error:", error);
    const message = error instanceof Error ? error.message : "Error al actualizar estado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
