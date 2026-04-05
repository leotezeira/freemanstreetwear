import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";
import { revalidatePath } from "next/cache";

const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "product-images";
const MAX_PRODUCT_IMAGE_BYTES = Number(process.env.MAX_PRODUCT_IMAGE_BYTES ?? String(4 * 1024 * 1024));
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_WIDTH = Number(process.env.MAX_PRODUCT_IMAGE_WIDTH ?? "1600");
const WEBP_QUALITY = Number(process.env.PRODUCT_IMAGE_WEBP_QUALITY ?? "82");
const MAX_IMAGES_PER_PRODUCT = 6;

export async function POST(request: Request, context: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await context.params;
    const form = await request.formData();
    const setPrimary = String(form.get("setPrimary") ?? "false") === "true";
    const files = form.getAll("files");

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const uploadFiles = files.filter((value): value is File => value instanceof File);
    if (uploadFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const [{ count: existingCount }, { data: maxSortRow, error: maxSortError }] = await Promise.all([
      supabase
        .from("product_images")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId),
      supabase
        .from("product_images")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (maxSortError) {
      return NextResponse.json({ error: maxSortError.message }, { status: 500 });
    }

    const currentCount = existingCount ?? 0;
    const remaining = Math.max(0, MAX_IMAGES_PER_PRODUCT - currentCount);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: `Máximo alcanzado: ${MAX_IMAGES_PER_PRODUCT} imágenes por producto` },
        { status: 409 }
      );
    }

    if (uploadFiles.length > remaining) {
      return NextResponse.json(
        { error: `Podés subir como máximo ${remaining} imagen(es) más (límite: ${MAX_IMAGES_PER_PRODUCT})` },
        { status: 409 }
      );
    }

    for (const file of uploadFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
      }

      if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
        return NextResponse.json({ error: `File too large. Max is ${MAX_PRODUCT_IMAGE_BYTES} bytes` }, { status: 400 });
      }
    }

    const uploadedPaths: string[] = [];
    const baseSortOrder = (maxSortRow?.sort_order ?? -1) + 1;
    for (const file of uploadFiles) {
      const filename = `${crypto.randomUUID()}.webp`;
      const path = `products/${productId}/${filename}`;

      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
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
      await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    }

    const insertPayload = uploadedPaths.map((image_path, index) => ({
      product_id: productId,
      image_path,
      sort_order: baseSortOrder + index,
      is_primary: setPrimary && index === 0,
    }));

    const { data: insertedRows, error: insertError } = await supabase
      .from("product_images")
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

export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await context.params;
    const body = (await request.json().catch(() => null)) as any;

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
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
        .from("product_images")
        .select("id")
        .eq("product_id", productId)
        .eq("sort_order", primarySortOrder)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data?.id) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
      targetId = String(data.id);
    }

    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);

    const { error: setError } = await supabase
      .from("product_images")
      .update({ is_primary: true })
      .eq("product_id", productId)
      .eq("id", targetId);

    if (setError) {
      return NextResponse.json({ error: setError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, primaryImageId: targetId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await context.params;
    const payload = (await request.json().catch(() => null)) as any;
    const imageId = payload?.imageId ? String(payload.imageId) : null;

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: existingImage, error: selectError } = await supabase
      .from("product_images")
      .select("id, image_path, is_primary")
      .eq("product_id", productId)
      .eq("id", imageId)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (!existingImage) {
      return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
    }

    if (existingImage.image_path) {
      const { error: removeError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove([existingImage.image_path]);

      if (removeError) {
        console.warn(
          "[api:admin:products:images:delete] No se pudo eliminar el archivo:",
          removeError.message
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .eq("product_id", productId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (existingImage.is_primary) {
      const { data: nextImage, error: nextError } = await supabase
        .from("product_images")
        .select("id")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextError) {
        return NextResponse.json({ error: nextError.message }, { status: 500 });
      }

      if (nextImage?.id) {
        const { error: setPrimaryError } = await supabase
          .from("product_images")
          .update({ is_primary: true })
          .eq("id", nextImage.id);

        if (setPrimaryError) {
          return NextResponse.json({ error: setPrimaryError.message }, { status: 500 });
        }
      }
    }

    revalidatePath("/admin/panel-admin/products");
    revalidatePath("/shop");
    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
