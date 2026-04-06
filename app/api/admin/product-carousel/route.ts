import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCarouselItemsForAdmin } from "@/lib/services/product-carousel.service";

function isMissingTable(error: unknown) {
  const message = (error as any)?.message;
  if (!message || typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return lower.includes("product_carousel_items") && (lower.includes("does not exist") || lower.includes("relation"));
}

export async function GET() {
  try {
    const items = await getCarouselItemsForAdmin();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al cargar" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { productIds?: unknown } | null;
    const rawIds = Array.isArray(body?.productIds) ? body?.productIds : [];
    const productIds = rawIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter((id) => id.length > 0);

    const uniqueIds = Array.from(new Set(productIds));
    const supabase = getSupabaseAdminClient();

    // Eliminar los que ya no estÃ¡n
    const { data: existing, error: existingError } = await supabase.from("product_carousel_items").select("product_id");
    if (existingError) {
      if (isMissingTable(existingError)) {
        return NextResponse.json({ error: "Falta la tabla product_carousel_items. EjecutÃ¡ la migraciÃ³n SQL." }, { status: 400 });
      }
      throw new Error(existingError.message);
    }

    const existingIds = new Set((existing ?? []).map((row: any) => row.product_id as string));
    const toDelete = Array.from(existingIds).filter((id) => !uniqueIds.includes(id));
    if (toDelete.length) {
      const { error: deleteError } = await supabase.from("product_carousel_items").delete().in("product_id", toDelete);
      if (deleteError) throw new Error(deleteError.message);
    }

    // Upsert ordenado
    if (uniqueIds.length) {
      const payload = uniqueIds.map((product_id, sort_order) => ({
        product_id,
        sort_order,
        is_active: true,
      }));
      const { error: upsertError } = await supabase.from("product_carousel_items").upsert(payload, { onConflict: "product_id" });
      if (upsertError) throw new Error(upsertError.message);
    } else {
      const { error: cleanError } = await supabase.from("product_carousel_items").delete().neq("product_id", null);
      if (cleanError) throw new Error(cleanError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isMissingTable(e)) {
      return NextResponse.json({ error: "Falta la tabla product_carousel_items. EjecutÃ¡ la migraciÃ³n SQL." }, { status: 400 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al guardar" }, { status: 500 });
  }
}
