"use client";

import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";

export default function AuthPageClient() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "register" ? "register" : "login";

  return (
    <main className="app-container py-10">
      <div className="mx-auto max-w-md">
        <div className="card-base">
          <div className="flex gap-2">
            <a
              className={`btn-secondary flex-1 text-center ${mode === "login" ? "opacity-100" : "opacity-70"}`}
              href="/auth?mode=login"
            >
              Ingresar
            </a>
            <a
              className={`btn-secondary flex-1 text-center ${mode === "register" ? "opacity-100" : "opacity-70"}`}
              href="/auth?mode=register"
            >
              Registrarse
            </a>
          </div>

          <div className="mt-6">{mode === "login" ? <LoginForm redirectTo="/" /> : <RegisterForm />}</div>
        </div>
      </div>
    </main>
  );
}
