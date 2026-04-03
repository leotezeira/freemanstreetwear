import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AppUser = {
  id: string;
  auth_id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
};

export async function getAllAppUsers(): Promise<AppUser[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAppUserByAuthId(authId: string): Promise<AppUser | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function createOrUpdateAppUser(
  authId: string,
  email: string
): Promise<AppUser> {
  const supabase = getSupabaseAdminClient();

  // Check if user exists
  const existing = await getAppUserByAuthId(authId);

  if (existing) {
    // Update last_login_at
    const { data, error } = await supabase
      .from("app_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("auth_id", authId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // Create new user
  const { data, error } = await supabase
    .from("app_users")
    .insert({ auth_id: authId, email })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateLastLogin(authId: string): Promise<AppUser> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("auth_id", authId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
