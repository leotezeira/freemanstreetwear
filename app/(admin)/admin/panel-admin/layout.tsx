import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
