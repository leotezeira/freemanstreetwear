import type { ReactNode } from "react";
import "./globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
