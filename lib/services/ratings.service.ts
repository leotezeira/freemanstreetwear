import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type RatingSummary = {
  averageRating: number;
  totalRatings: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
};

// ========== PRODUCT RATINGS ==========

export async function getProductRatingSummary(productId: string): Promise<RatingSummary> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_ratings")
    .select("rating")
    .eq("product_id", productId);

  if (error) throw new Error(error.message);

  const ratings = data ?? [];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach((r) => {
    distribution[r.rating as keyof typeof distribution]++;
  });

  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0 ? ratings.reduce((acc, r) => acc + r.rating, 0) / totalRatings : 0;

  return {
    averageRating: Math.round(averageRating * 100) / 100,
    totalRatings,
    distribution,
  };
}

export async function getUserProductRating(
  productId: string,
  appUserId: string
): Promise<number | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_ratings")
    .select("rating")
    .eq("product_id", productId)
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.rating ?? null;
}

export async function rateProduct(
  productId: string,
  appUserId: string,
  rating: number
): Promise<number> {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const supabase = getSupabaseAdminClient();

  // Upsert: insert if not exists, update if exists
  const { error } = await supabase.from("product_ratings").upsert(
    { product_id: productId, app_user_id: appUserId, rating },
    { onConflict: "product_id,app_user_id" }
  );

  if (error) throw new Error(error.message);
  return rating;
}

// ========== BUNDLE RATINGS ==========

export async function getBundleRatingSummary(bundleId: string): Promise<RatingSummary> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bundle_ratings")
    .select("rating")
    .eq("bundle_id", bundleId);

  if (error) throw new Error(error.message);

  const ratings = data ?? [];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach((r) => {
    distribution[r.rating as keyof typeof distribution]++;
  });

  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0 ? ratings.reduce((acc, r) => acc + r.rating, 0) / totalRatings : 0;

  return {
    averageRating: Math.round(averageRating * 100) / 100,
    totalRatings,
    distribution,
  };
}

export async function getUserBundleRating(
  bundleId: string,
  appUserId: string
): Promise<number | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bundle_ratings")
    .select("rating")
    .eq("bundle_id", bundleId)
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.rating ?? null;
}

export async function rateBundle(
  bundleId: string,
  appUserId: string,
  rating: number
): Promise<number> {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const supabase = getSupabaseAdminClient();

  // Upsert: insert if not exists, update if exists
  const { error } = await supabase.from("bundle_ratings").upsert(
    { bundle_id: bundleId, app_user_id: appUserId, rating },
    { onConflict: "bundle_id,app_user_id" }
  );

  if (error) throw new Error(error.message);
  return rating;
}
