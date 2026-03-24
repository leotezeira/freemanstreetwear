import { getSupabasePublicServerClient } from "@/lib/supabase/public";

export type PaymentMethod = {
  id: string;
  label: string;
  enabled: boolean;
  type: "gateway" | "manual";
  instructions?: string;
};

export async function getEnabledPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const supabase = getSupabasePublicServerClient();
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "payment_methods")
      .maybeSingle();

    const all = (data?.value as PaymentMethod[]) ?? [];
    return all.filter((m) => m.enabled);
  } catch {
    return [
      {
        id: "mercadopago",
        label: "MercadoPago",
        enabled: true,
        type: "gateway",
      },
    ];
  }
}
