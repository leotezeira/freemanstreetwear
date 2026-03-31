import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    // Si no es ?all=true, retornar solo productos activos (para búsqueda)
    let query = supabase
      .from("products")
      .select("id, name, category, price, compare_at_price, stock, is_active, product_images (image_path, is_primary)");

    if (!all) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("category", { ascending: true }).order("name", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    console.error("[api:admin:products:all:GET]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los productos" },
      { status: 500 }
    );
  }
}
