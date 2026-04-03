"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      // Ensure session is persisted (cookies/storage) before navigating to a protected route.
      await supabase.auth.getSession();

      // Registrar último login
      if (data.user?.id) {
        try {
          await fetch("/api/app-users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authId: data.user.id }),
          });
        } catch (err) {
          console.warn("No se pudo actualizar último login:", err);
        }
      }

      router.replace(redirectTo ?? "/");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setMessage(null);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Ingresá tu email para recuperar la contraseña");
      return;
    }

    setResetLoading(true);

    try {
      const supabase = getSupabaseClient();
      const baseOrigin = window.location.origin.replace(/\/$/, "");
      const redirectTo = `${baseOrigin}/auth/confirm?next=/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        if (error.message.toLowerCase().includes("redirect")) {
          throw new Error(
            "Supabase rechazó la URL de redirección. En Supabase → Authentication → URL Configuration agregá como Redirect URL: https://freemanstreetwear.vercel.app/auth/confirm"
          );
        }
        throw error;
      }

      setMessage("Te enviamos un email para recuperar tu contraseña.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar el email de recuperación");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="input-base"
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="input-base"
        required
      />

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button className="btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>

      <button
        className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
        type="button"
        onClick={handleResetPassword}
        disabled={resetLoading}
      >
        {resetLoading ? "Enviando email..." : "Recuperar contraseña"}
      </button>

      <p className="text-sm text-slate-500">
        ¿No tenés cuenta? <Link href="/auth?mode=register" className="font-semibold text-slate-900">Crear cuenta</Link>
      </p>
    </form>
  );
}
