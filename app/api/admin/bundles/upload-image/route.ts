import { NextRequest, NextResponse } from "next/server";
import { uploadBundleImage } from "@/lib/services/bundle-images.service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const filePath = await uploadBundleImage(formData);
    
    // Devolver el filePath relativo (no URL)
    return NextResponse.json({ filePath });
  } catch (error) {
    console.error("[api:admin:bundles:upload-image]", error);
    const message = error instanceof Error ? error.message : "Error al subir la imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
