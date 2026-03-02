import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin env vars are not configured");
  }

  // Catch a very common misconfiguration: using anon/publishable key instead of service_role.
  // service_role is a JWT (three dot-separated segments). Publishable keys often start with "sb_publishable_".
  const looksLikeJwt = serviceRoleKey.split(".").length === 3;
  const looksPublishable = serviceRoleKey.startsWith("sb_publishable_");
  if (!looksLikeJwt || looksPublishable) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY inválida. Usá la key service_role (JWT) desde Supabase → Settings → API, y cargala en Vercel (Production)."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
