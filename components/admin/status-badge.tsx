import { type ReactNode } from "react";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function StatusBadge({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral"; children: ReactNode }) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide";

  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : tone === "warning"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
        : tone === "danger"
          ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200";

  return <span className={classNames(base, toneClass)}>{children}</span>;
}
