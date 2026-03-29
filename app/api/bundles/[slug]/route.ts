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

    // Resolver signed URLs para las imágenes del bundle
    const images = await Promise.all(
      (bundle.bundle_images ?? []).map(async (img) => ({
        id: img.id,
        url: await createSignedBundleImageUrl(img.image_path).catch(() => null),
        is_primary: img.is_primary,
        sort_order: img.sort_order,
      }))
    );

    // Obtener imagen primaria o la primera
    const primaryImage = images.find((img) => img.is_primary) ?? images[0] ?? null;

    return NextResponse.json({
      bundle: {
        ...bundle,
        image_path: primaryImage?.url ?? null,
      },
      images,
    });
  } catch (error) {
    console.error("[api:bundles:slug:GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el bundle" },
      { status: 500 }
    );
  }
}
