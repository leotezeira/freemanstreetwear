"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

type GalleryImage = {
  id: string;
  url: string;
  isPrimary?: boolean;
};

type ProductGalleryProps = {
  images: GalleryImage[];
  alt: string;
};

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const sorted = useMemo(() => {
    const copy = [...images];
    copy.sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
    return copy;
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const active = sorted[activeIndex] ?? sorted[0];
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [sorted.length]);

  function scrollToIndex(idx: number) {
    const el = carouselRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: idx * width, behavior: "smooth" });
    setActiveIndex(idx);
  }

  return (
    <div className="space-y-3">
      {/* Mobile carousel */}
      <div className="lg:hidden">
        <div
          ref={carouselRef}
          className="flex w-full snap-x snap-mandatory overflow-x-auto rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950"
          onScroll={(e) => {
            const el = e.currentTarget;
            const width = el.clientWidth;
            const idx = Math.round(el.scrollLeft / Math.max(1, width));
            setActiveIndex(Math.min(sorted.length - 1, Math.max(0, idx)));
          }}
        >
          {sorted.length ? (
            sorted.map((img) => (
              <div key={img.id} className="w-full shrink-0 snap-center">
                <img src={img.url} alt={alt} className="aspect-square w-full object-cover" decoding="async" />
              </div>
            ))
          ) : (
            <div className="w-full shrink-0 snap-center">
              <img src="/product-placeholder.svg" alt={alt} className="aspect-square w-full object-cover" />
            </div>
          )}
        </div>

        {sorted.length > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            {sorted.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                className={[
                  "h-2.5 w-2.5 rounded-full transition",
                  idx === activeIndex ? "bg-slate-900 dark:bg-slate-50" : "bg-slate-300 dark:bg-slate-700",
                ].join(" ")}
                aria-label={`Ir a imagen ${idx + 1}`}
                onClick={() => scrollToIndex(idx)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Desktop gallery */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[96px_minmax(0,1fr)]">
        {sorted.length > 1 ? (
          <div className="space-y-2">
            {sorted.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={[
                  "block overflow-hidden rounded-2xl border transition",
                  idx === activeIndex ? "border-slate-900 dark:border-slate-50" : "border-slate-200 hover:border-slate-900 dark:border-slate-800 dark:hover:border-slate-300",
                ].join(" ")}
                aria-label="Seleccionar imagen"
              >
                <img src={img.url} alt="" className="aspect-square h-20 w-20 object-cover" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}

        <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
          <img
            src={active?.url ?? "/product-placeholder.svg"}
            alt={alt}
            className="aspect-square w-full object-cover transition duration-200 group-hover:scale-110"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
