import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  other: {
    "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  },
};

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <head>
        {/* Script que evita el flash blanco en carga inicial */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.addEventListener('DOMContentLoaded', function() {
                  document.body.classList.add('ready');
                });
              })();
            `,
          }}
        />
        {/* Preload fuentes críticas */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
          as="style"
        />
        {/* Cache agresivo para imágenes estáticas */}
        <meta httpEquiv="Cache-Control" content="public, max-age=31536000, immutable" />
      </head>
      <body className="min-h-screen bg-slate-50 pb-28 sm:pb-0">
        {children}
      </body>
    </html>
  );
}
