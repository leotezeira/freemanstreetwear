/* eslint-disable @next/next/no-page-custom-font */
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
        {/* Ensures the page displays only after the initial ready class is set */}
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
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
          as="style"
        />
        {/* Aggressive caching for static assets */}
        <meta httpEquiv="Cache-Control" content="public, max-age=31536000, immutable" />
      </head>
      <body className="min-h-screen bg-slate-50 pb-28 sm:pb-0">
        {children}
      </body>
    </html>
  );
}
