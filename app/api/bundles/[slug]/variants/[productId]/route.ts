import { NextResponse } from "next/server";
import { getProductVariants } from "@/lib/services/bundles.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const variants = await getProductVariants(productId);

    return NextResponse.json({ variants });
  } catch (error) {
    console.error("[api:bundles:variants:GET]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las variantes" },
      { status: 500 }
    );
  }
}
