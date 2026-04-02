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

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "clamp(400px, 50vw, 600px)" }}>
      <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: fading ? 0 : 1 }}>
        <ClientImage
          src={banner.signed_url ?? null}
          alt={banner.title ?? "Banner"}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
      </div>

      <div
        className="relative z-10 flex h-full flex-col justify-center px-8 transition-opacity duration-300 md:px-16 lg:px-24"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {banner.title ? (
          <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
            {banner.title}
          </h1>
        ) : null}
        {banner.subtitle ? (
          <p className="mt-3 max-w-xl text-base text-white/90 drop-shadow md:text-lg">{banner.subtitle}</p>
        ) : null}
        {banner.cta_label && banner.cta_href ? (
          <div className="mt-6">
            <Link
              href={banner.cta_href}
              className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
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
                "h-2 rounded-full transition-all duration-300",
                idx === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80",
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
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
            aria-label="Anterior"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo((current + 1) % total)}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
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
