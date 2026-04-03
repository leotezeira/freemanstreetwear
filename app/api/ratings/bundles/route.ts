import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getBundleRatingSummary,
  rateBundle,
} from "@/lib/services/ratings.service";

export async function GET(req: NextRequest) {
  try {
    const bundleId = req.nextUrl.searchParams.get("bundleId");

    if (!bundleId) {
      return NextResponse.json(
        { error: "bundleId is required" },
        { status: 400 }
      );
    }

    const summary = await getBundleRatingSummary(bundleId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching bundle ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bundle ratings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bundleId, rating } = body;

    if (!bundleId || rating === undefined) {
      return NextResponse.json(
        { error: "bundleId and rating are required" },
        { status: 400 }
      );
    }

    // Get the authenticated user's ID from Supabase
    const supabase = getSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.admin.getUserBySql("SELECT * FROM auth.users LIMIT 1");

    if (!user) {
      return NextResponse.json(
        { error: "User must be authenticated" },
        { status: 401 }
      );
    }

    // Get the app user ID
    const { data: appUser, error: appUserError } = await supabase
      .from("app_users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (appUserError || !appUser) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const result = await rateBundle(bundleId, appUser.id, rating);
    const summary = await getBundleRatingSummary(bundleId);

    return NextResponse.json({
      success: true,
      userRating: result,
      summary,
    });
  } catch (error) {
    console.error("Error submitting bundle rating:", error);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 }
    );
  }
}
