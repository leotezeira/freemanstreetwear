"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Registrar usuario en app_users
      if (data.user?.id) {
        try {
          await fetch("/api/app-users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authId: data.user.id, email }),
          });
        } catch (err) {
          console.warn("No se pudo registrar usuario en app_users:", err);
        }
      }

      setMessage("Cuenta creada. Revisá tu email si tenés confirmación activa en Supabase.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
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
        minLength={6}
      />

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button className="btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-sm text-slate-500">
        ¿Ya tenés cuenta? <Link href="/auth?mode=login" className="font-semibold text-slate-900">Iniciar sesión</Link>
      </p>
    </form>
  );
}
