// =====================================================
// API: GET /api/bundles
// Obtiene todos los bundles activos
// =====================================================

import { NextResponse } from "next/server";
import { getActiveBundles } from "@/lib/services/bundles.service";

export async function GET() {
  try {
    const bundles = await getActiveBundles();
    return NextResponse.json({ bundles });
  } catch (error) {
    console.error("[api:bundles:GET]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los bundles" },
      { status: 500 }
    );
  }
}
