import { TRANSFER_DISCOUNT_PERCENT } from "@/lib/config/pricing";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicServerClient } from "@/lib/supabase/public";

export const TRANSFER_DISCOUNT_KEY = "transfer_discount_percent";

function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value)) return TRANSFER_DISCOUNT_PERCENT;
  return Math.max(0, Math.min(100, value));
}

function parseStoredValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function getTransferDiscountPercent() {
  try {
    const supabase = getSupabasePublicServerClient();
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", TRANSFER_DISCOUNT_KEY)
      .maybeSingle();

    if (data) {
      const stored = parseStoredValue(data.value);
      if (stored !== null) {
        return clampDiscountPercent(stored);
      }
    }
  } catch (error) {
    console.error("[getTransferDiscountPercent]", error);
  }

  return TRANSFER_DISCOUNT_PERCENT;
}

export async function setTransferDiscountPercent(value: number) {
  const percent = clampDiscountPercent(value);
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("site_content")
    .upsert(
      { key: TRANSFER_DISCOUNT_KEY, value: percent },
      { onConflict: "key" }
    );

  if (error) {
    throw new Error(error.message);
  }

  return percent;
}
