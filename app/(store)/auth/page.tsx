import { Suspense } from "react";
import AuthPageClient from "./page-client";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageClient />
    </Suspense>
  );
}
