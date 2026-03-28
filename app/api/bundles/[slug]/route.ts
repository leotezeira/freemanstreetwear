import { NextResponse } from "next/server";
import { getBundleBySlug } from "@/lib/services/bundles.service";
import { createSignedBundleImageUrl } from "@/lib/services/bundle-images.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    console.log("[bundles/slug API] Request for slug:", slug);
    
    const bundle = await getBundleBySlug(slug);
    console.log("[bundles/slug API] Bundle retrieved:", bundle ? { id: bundle.id, name: bundle.name, image_path: bundle.image_path?.substring(0, 50) } : null);

    if (!bundle) {
      return NextResponse.json({ error: "Bundle no encontrado" }, { status: 404 });
    }

    // Resolver imagen del bundle
    let resolvedImagePath = bundle.image_path;
    if (bundle.image_path && !bundle.image_path.startsWith("http")) {
      console.log("[bundles/slug API] Generating signed URL for:", bundle.image_path);
      resolvedImagePath = await createSignedBundleImageUrl(bundle.image_path).catch(
        (err) => {
          console.error("[bundles/slug API] Signed URL error:", err);
          return bundle.image_path;
        }
      );
    }

    console.log("[bundles/slug API] Returning bundle with image_path:", resolvedImagePath?.substring(0, 80));
    return NextResponse.json({ bundle: { ...bundle, image_path: resolvedImagePath } });
  } catch (error) {
    console.error("[api:bundles:slug:GET]", error);
    return NextResponse.json(
      { error: "No se pudo cargar el bundle" },
      { status: 500 }
    );
  }
}
