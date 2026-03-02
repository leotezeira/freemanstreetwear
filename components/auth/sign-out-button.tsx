"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type SignOutButtonProps = {
  redirectTo?: string;
};

export function SignOutButton({ redirectTo = "/" }: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-secondary" type="button" onClick={handleSignOut} disabled={loading}>
      {loading ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}
