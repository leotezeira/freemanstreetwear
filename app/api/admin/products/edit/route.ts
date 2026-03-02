import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeProductHtml } from "@/lib/utils/sanitize";
import { revalidatePath } from "next/cache";

function parseTags(input: string) {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function toOptionalNumber(value: string | null) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const supabase = getSupabaseAdminClient();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 });
    }

    const name = String(formData.get("name") ?? "").trim();
    const descriptionRaw = String(formData.get("description") ?? "");
    const description = sanitizeProductHtml(descriptionRaw);

    const payload = {
      name,
      description,
      price: Number(formData.get("price") ?? 0),
      compare_at_price: toOptionalNumber(String(formData.get("compareAtPrice") ?? "")) as number | null,
      stock: Number(formData.get("stock") ?? 0),
      category: String(formData.get("category") ?? "").trim() || null,
      tags: parseTags(String(formData.get("tags") ?? "")),
      weight_grams: toOptionalNumber(String(formData.get("weightGrams") ?? "")) as number | null,
      height: toOptionalNumber(String(formData.get("height") ?? "")) as number | null,
      width: toOptionalNumber(String(formData.get("width") ?? "")) as number | null,
      length: toOptionalNumber(String(formData.get("length") ?? "")) as number | null,
      meta_title: String(formData.get("metaTitle") ?? "").trim() || null,
      meta_description: String(formData.get("metaDescription") ?? "").trim() || null,
      is_active: String(formData.get("isActive") ?? "false") === "true",
    };

    const { error } = await supabase.from("products").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/panel-admin/products");
    revalidatePath(`/admin/panel-admin/products/${id}`);
    revalidatePath("/shop");
    revalidatePath("/");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[api:admin:products:edit]", error);
    const message = error instanceof Error ? error.message : "Error al actualizar producto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
