"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string | null;
  variant: ToastVariant;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id"> & { durationMs?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id"> & { durationMs?: number }) => {
      const id = crypto.randomUUID();
      const t: Toast = {
        id,
        title: toast.title,
        description: toast.description ?? null,
        variant: toast.variant,
      };

      setToasts((prev) => [t, ...prev].slice(0, 4));

      const duration = Math.max(1500, Math.min(10_000, toast.durationMs ?? 3500));
      const timer = window.setTimeout(() => remove(id), duration);
      timers.current.set(id, timer);
    },
    [remove]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => {
          const icon = t.variant === "success" ? CheckCircle2 : t.variant === "error" ? AlertTriangle : Info;
          const border = t.variant === "error" ? "border-red-200 dark:border-red-900/40" : "border-slate-200 dark:border-slate-800";
          const title = t.variant === "error" ? "text-red-800 dark:text-red-200" : "text-slate-900 dark:text-slate-50";
          const desc = t.variant === "error" ? "text-red-700 dark:text-red-200/80" : "text-slate-600 dark:text-slate-300";

          return (
            <div key={t.id} className={["pointer-events-auto rounded-2xl border bg-white p-3 shadow-soft dark:bg-slate-950", border].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-slate-700 dark:text-slate-200">
                  <Icon icon={icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={["text-sm font-semibold", title].join(" ")}>{t.title}</p>
                  {t.description ? <p className={["mt-0.5 text-sm", desc].join(" ")}>{t.description}</p> : null}
                </div>
                <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" onClick={() => remove(t.id)} aria-label="Cerrar">
                  <Icon icon={X} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
