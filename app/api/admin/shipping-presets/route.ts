import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const createPresetSchema = z.object({
  name: z.string().trim().min(2).max(60),
  weightGrams: z.number().int().positive(),
  height: z.number().int().nonnegative().nullable().optional(),
  width: z.number().int().nonnegative().nullable().optional(),
  length: z.number().int().nonnegative().nullable().optional(),
});

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("shipping_presets")
      .select("id, name, weight_grams, height, width, length, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ presets: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const parsed = createPresetSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const payload = {
      name: parsed.data.name,
      weight_grams: parsed.data.weightGrams,
      height: parsed.data.height ?? null,
      width: parsed.data.width ?? null,
      length: parsed.data.length ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("shipping_presets")
      .upsert(payload, { onConflict: "name" })
      .select("id, name, weight_grams, height, width, length, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, preset: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
