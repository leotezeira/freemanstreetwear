import { NextResponse } from "next/server";
import { getBundleBySlug } from "@/lib/services/bundles.service";
import { createSignedBundleImageUrl } from "@/lib/services/bundle-images.service";

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

    // Resolver imagen del bundle
    let resolvedImagePath = bundle.image_path;
    if (bundle.image_path && !bundle.image_path.startsWith("http")) {
      resolvedImagePath = await createSignedBundleImageUrl(bundle.image_path).catch(
        () => bundle.image_path
      );
    }

    return NextResponse.json({ bundle: { ...bundle, image_path: resolvedImagePath } });
  } catch (error) {
    console.error("[api:bundles:slug:GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el bundle" },
      { status: 500 }
    );
  }
}
