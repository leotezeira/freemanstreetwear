import { NextResponse } from "next/server";
import { getBundleBySlug } from "@/lib/services/bundles.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const bundle = await getBundleBySlug(slug);

    if (!bundle) {
      return NextResponse.json({ error: "Bundle no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ bundle });
  } catch (error) {
    console.error("[api:bundles:slug:GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el bundle" },
      { status: 500 }
    );
  }
}
