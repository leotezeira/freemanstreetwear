import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const METRICS_KEY = "site_metrics";

export type SiteMetrics = {
  pageViews: number;
};

const defaultMetrics: SiteMetrics = {
  pageViews: 0,
};

export async function getSiteMetrics(): Promise<SiteMetrics> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", METRICS_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.value || typeof data.value !== "object") {
    return defaultMetrics;
  }

  const value = data.value as Partial<SiteMetrics>;
  return {
    pageViews: Number(value.pageViews ?? 0),
  };
}

export async function incrementPageViews(): Promise<SiteMetrics> {
  const supabase = getSupabaseAdminClient();

  const current = await getSiteMetrics();
  const next = { pageViews: current.pageViews + 1 };

  const { error } = await supabase
    .from("site_content")
    .upsert({ key: METRICS_KEY, value: next }, { onConflict: "key" });

  if (error) {
    throw new Error(error.message);
  }

  return next;
}
