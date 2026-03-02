"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (!data.session) {
        setError("Sesión de recuperación ausente. Abrí nuevamente el link del email.");
      }
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Contraseña actualizada. Redirigiendo...");
    setTimeout(() => router.replace("/auth?mode=login"), 800);
  }

  return (
    <main className="app-container py-10">
      <div className="mx-auto max-w-md">
        <div className="card-base">
          <h1 className="text-2xl font-black tracking-tight">Restablecer contraseña</h1>
          <p className="mt-2 text-sm text-slate-600">Ingresá tu nueva contraseña.</p>

          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            <input
              className="input-base"
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              className="input-base"
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
