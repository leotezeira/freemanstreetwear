import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Optimiza automáticamente a WebP/AVIF según el navegador
    formats: ["image/avif", "image/webp"],
    // Cache agresivo en Vercel
    minimumCacheTTL: 31536000, // 1 año
    // Remota URLs permitidas (si usas URLs de terceros)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  headers: async () => {
    return [
      {
        source: "/public/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
