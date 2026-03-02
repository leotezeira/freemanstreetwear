import type { ReactNode } from "react";

export default function AdminShellLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
