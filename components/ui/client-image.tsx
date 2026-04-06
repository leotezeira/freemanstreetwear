// =====================================================
// COMPONENTE: ClientImage con fallback automático
// =====================================================

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
};

/**
 * Componente de imagen con fallback automático
 * 
 * @param src - URL de la imagen (puede ser null/undefined)
 * @param alt - Texto alternativo
 * @param className - Clases CSS
 * @param fallbackSrc - URL de imagen de fallback (default: placeholder SVG)
 */
export function ClientImage({ src, alt, className, fallbackSrc }: Props) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc || DEFAULT_FALLBACK);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      decoding="async"
      onError={() => setImgSrc(fallbackSrc || DEFAULT_FALLBACK)}
    />
  );
}

// Placeholder SVG por defecto (imagen rota)
const DEFAULT_FALLBACK = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpolyline points="21 15 16 10 5 21"/%3E%3C/svg%3E`;
