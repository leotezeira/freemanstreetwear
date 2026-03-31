// =====================================================
// ADMIN: /admin/panel-admin/bundles/[id]
// Redirige al formulario de edición
// =====================================================

"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function AdminBundleEditRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    if (params.id) {
      router.push(`/admin/panel-admin/bundles/new?edit=${params.id}`);
    }
  }, [params.id, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-slate-600 dark:text-slate-400">Redirigiendo...</p>
    </div>
  );
}
