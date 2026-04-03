import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSignedProductImageUrl } from "@/lib/services/product-images.service";

export type HeroBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_path: string;
  sort_order: number;
  is_active: boolean;
  title_font: string | null;
  subtitle_font: string | null;
  text_color: string | null;
  cta_text_color: string | null;
  cta_bg_color: string | null;
  zoom: number | null;
  overlay_top: number | null;
  overlay_bottom: number | null;
  created_at: string;
  signed_url?: string | null;
};

export type HeroBannerSettings = {
  interval_ms: number;
};

const DEFAULT_SETTINGS: HeroBannerSettings = { interval_ms: 5000 };

async function withSignedUrls(banners: HeroBanner[]): Promise<HeroBanner[]> {
  if (!banners.length) return [];
  return Promise.all(
    banners.map(async (b) => ({
      ...b,
      signed_url: b.image_path ? await createSignedProductImageUrl(b.image_path).catch(() => null) : null,
    }))
  );
}

export async function getActiveBanners(): Promise<HeroBanner[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("hero_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return [];
  return withSignedUrls(data as HeroBanner[]);
}

export async function getAllBanners(): Promise<HeroBanner[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("hero_banners").select("*").order("sort_order", { ascending: true });

  if (error || !data?.length) return [];
  return withSignedUrls(data as HeroBanner[]);
}

export async function getBannerSettings(): Promise<HeroBannerSettings> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("site_content").select("value").eq("key", "hero_settings").maybeSingle();
  return (data?.value as HeroBannerSettings) ?? DEFAULT_SETTINGS;
}

export async function saveBannerSettings(settings: HeroBannerSettings) {
  const supabase = getSupabaseAdminClient();
  await supabase.from("site_content").upsert({ key: "hero_settings", value: settings }, { onConflict: "key" });
}

