import { NextRequest, NextResponse } from "next/server";
import { uploadBundleImage } from "@/lib/services/bundle-images.service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageUrl = await uploadBundleImage(formData);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("[api:admin:bundles:upload-image]", error);
    const message = error instanceof Error ? error.message : "Error al subir la imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
