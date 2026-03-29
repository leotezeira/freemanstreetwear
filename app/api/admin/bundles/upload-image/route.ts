import { NextResponse } from "next/server";

/**
 * @deprecated Este endpoint está deprecado.
 * Usar /api/admin/bundles/[id]/images para subir imágenes de bundles.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Endpoint deprecado. Usar /api/admin/bundles/[id]/images" },
    { status: 410 }
  );
}
