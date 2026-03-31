import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const BUNDLE_IMAGES_BUCKET = process.env.BUNDLE_IMAGES_BUCKET ?? "bundle-images";
const MAX_BUNDLE_IMAGE_BYTES = Number(process.env.MAX_BUNDLE_IMAGE_BYTES ?? String(4 * 1024 * 1024));
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_WIDTH = Number(process.env.MAX_BUNDLE_IMAGE_WIDTH ?? "1600");
const WEBP_QUALITY = Number(process.env.BUNDLE_IMAGE_WEBP_QUALITY ?? "82");
const MAX_IMAGES_PER_BUNDLE = 6;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: bundleId } = await context.params;
    const form = await request.formData();
    const setPrimary = String(form.get("setPrimary") ?? "false") === "true";
    const files = form.getAll("files");

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 });
    }

    const uploadFiles = files.filter((value): value is File => value instanceof File);
    if (uploadFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const [{ count: existingCount }, { data: maxSortRow, error: maxSortError }] = await Promise.all([
      supabase
        .from("bundle_images")
        .select("id", { count: "exact", head: true })
        .eq("bundle_id", bundleId),
      supabase
        .from("bundle_images")
        .select("sort_order")
        .eq("bundle_id", bundleId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (maxSortError) {
      return NextResponse.json({ error: maxSortError.message }, { status: 500 });
    }

    const currentCount = existingCount ?? 0;
    const remaining = Math.max(0, MAX_IMAGES_PER_BUNDLE - currentCount);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: `Máximo alcanzado: ${MAX_IMAGES_PER_BUNDLE} imágenes por bundle` },
        { status: 409 }
      );
    }

    if (uploadFiles.length > remaining) {
      return NextResponse.json(
        { error: `Podés subir como máximo ${remaining} imagen(es) más (límite: ${MAX_IMAGES_PER_BUNDLE})` },
        { status: 409 }
      );
    }

    for (const file of uploadFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
      }

      if (file.size > MAX_BUNDLE_IMAGE_BYTES) {
        return NextResponse.json({ error: `File too large. Max is ${MAX_BUNDLE_IMAGE_BYTES} bytes` }, { status: 400 });
      }
    }

    const uploadedPaths: string[] = [];
    const baseSortOrder = (maxSortRow?.sort_order ?? -1) + 1;
    for (const file of uploadFiles) {
      const filename = `${crypto.randomUUID()}.webp`;
      const path = `bundles/${bundleId}/${filename}`;

      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      const { error: uploadError } = await supabase.storage
        .from(BUNDLE_IMAGES_BUCKET)
        .upload(path, webpBuffer, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      uploadedPaths.push(path);
    }

    if (setPrimary) {
      await supabase.from("bundle_images").update({ is_primary: false }).eq("bundle_id", bundleId);
    }

    const insertPayload = uploadedPaths.map((image_path, index) => ({
      bundle_id: bundleId,
      image_path,
      sort_order: baseSortOrder + index,
      is_primary: setPrimary && index === 0,
    }));

    const { data: insertedRows, error: insertError } = await supabase
      .from("bundle_images")
      .insert(insertPayload)
      .select("id, sort_order, image_path, is_primary");
    
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, uploaded: uploadedPaths.length, images: insertedRows ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: bundleId } = await context.params;
    const body = (await request.json().catch(() => null)) as any;

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId" }, { status: 400 });
    }

    const primaryImageId = body?.primaryImageId ? String(body.primaryImageId) : null;
    const primarySortOrder = Number.isFinite(Number(body?.primarySortOrder)) ? Number(body.primarySortOrder) : null;

    if (!primaryImageId && primarySortOrder === null) {
      return NextResponse.json({ error: "Missing primaryImageId or primarySortOrder" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    let targetId = primaryImageId;
    if (!targetId && primarySortOrder !== null) {
      const { data, error } = await supabase
        .from("bundle_images")
        .select("id")
        .eq("bundle_id", bundleId)
        .eq("sort_order", primarySortOrder)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      targetId = data?.id ?? null;
    }

    if (!targetId) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await supabase.from("bundle_images").update({ is_primary: false }).eq("bundle_id", bundleId);
    await supabase.from("bundle_images").update({ is_primary: true }).eq("id", targetId);

    return NextResponse.json({ ok: true, primaryImageId: targetId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: bundleId } = await context.params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!bundleId || !imageId) {
      return NextResponse.json({ error: "Missing bundleId or imageId" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Get image path before deleting
    const { data: imageData, error: fetchError } = await supabase
      .from("bundle_images")
      .select("image_path")
      .eq("id", imageId)
      .eq("bundle_id", bundleId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Delete from storage
    if (imageData?.image_path) {
      await supabase.storage.from(BUNDLE_IMAGES_BUCKET).remove([imageData.image_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("bundle_images")
      .delete()
      .eq("id", imageId)
      .eq("bundle_id", bundleId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
