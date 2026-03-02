import { createServerClient } from "@supabase/ssr";

// Public (catalog) client: ALWAYS uses anon key and ignores auth cookies.
// This prevents accidental coupling between catalog reads and logged-in sessions.
export function getSupabasePublicServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public env vars are not configured");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // no-op
      },
    },
  });
}
