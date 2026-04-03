"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroBanner } from "@/lib/services/hero-banners.service";
import { ClientImage } from "@/components/ui/client-image";

type Props = {
  banners: HeroBanner[];
  intervalMs: number;
};

export function HeroCarousel({ banners, intervalMs }: Props) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = banners.length;

  const goTo = useCallback(
    (index: number) => {
      if (index === current) return;
      setFading(true);
      setTimeout(() => {
        setCurrent(index);
        setFading(false);
      }, 350);
    },
    [current]
  );

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setTimeout(() => goTo((current + 1) % total), Math.max(1000, intervalMs));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, total, intervalMs, goTo]);

  if (!total) return null;
  const banner = banners[current];

  const overlayTop = typeof banner.overlay_top === "number" ? banner.overlay_top : 0.95;
  const overlayBottom = typeof banner.overlay_bottom === "number" ? banner.overlay_bottom : 0.95;

  const overlayBackground = `linear-gradient(
    to bottom,
    rgba(248, 246, 240, ${overlayTop}) 0%,
    rgba(248, 246, 240, ${Math.max(0, overlayTop * 0.6)}) 15%,
    rgba(248, 246, 240, 0) 35%,
    rgba(248, 246, 240, 0) 65%,
    rgba(248, 246, 240, ${Math.max(0, overlayBottom * 0.6)}) 85%,
    rgba(248, 246, 240, ${overlayBottom}) 100%
  )`;

  return (
    <section className="hero-premium">
      <div
        className="hero-bg-layer transition-opacity duration-300"
        style={{
          opacity: fading ? 0 : 1,
          "--hero-zoom": `${banner.zoom ?? 1.08}`,
        } as React.CSSProperties}
      >
        <ClientImage
          src={banner.signed_url ?? null}
          alt={banner.title ?? "Banner"}
          className="hero-bg-image"
        />
        <div className="hero-overlay-premium" style={{ background: overlayBackground }} />
      </div>

      <div className="hero-content-premium transition-opacity duration-300" style={{ opacity: fading ? 0 : 1 }}>
        {banner.title ? (
          <h1
            className="hero-title"
            style={{
              color: banner.text_color ?? undefined,
              fontFamily: banner.title_font ?? undefined,
            }}
          >
            {banner.title}
          </h1>
        ) : null}
        {banner.subtitle ? (
          <p
            className="hero-subtitle"
            style={{
              color: banner.text_color ?? undefined,
              fontFamily: banner.subtitle_font ?? undefined,
            }}
          >
            {banner.subtitle}
          </p>
        ) : null}
        {banner.cta_label && banner.cta_href ? (
          <div>
            <Link
              href={banner.cta_href}
              className="hero-cta"
              style={{
                color: banner.cta_text_color ?? undefined,
                backgroundColor: banner.cta_bg_color ?? undefined,
                fontFamily: banner.title_font ?? undefined,
              }}
            >
              {banner.cta_label}
            </Link>
          </div>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {banners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goTo(idx)}
              aria-label={`Banner ${idx + 1}`}
              className={[
                "h-2 rounded-full transition-all duration-300 bg-white/60 backdrop-blur",
                idx === current ? "w-7 bg-white" : "w-2 hover:bg-white",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goTo((current - 1 + total) % total)}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white backdrop-blur-sm transition hover:bg-black/40"
            aria-label="Anterior"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo((current + 1) % total)}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white backdrop-blur-sm transition hover:bg-black/40"
            aria-label="Siguiente"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      ) : null}
    </section>
  );
}
