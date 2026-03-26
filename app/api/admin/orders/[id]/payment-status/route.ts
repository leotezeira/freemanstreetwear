import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { payment_status } = body;

    if (!["pending", "approved", "rejected"].includes(payment_status)) {
      return NextResponse.json(
        { error: "Estado de pago inválido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("orders")
      .update({ payment_status })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, payment_status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
