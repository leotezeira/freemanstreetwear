"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/domain";
import { ProductCard } from "@/components/products/product-card";
import { Icon } from "@/components/ui/icon";
import { Pause, Play } from "lucide-react";

type Props = {
  products: Product[];
  transferDiscountPercent?: number;
};

export function ProductCarousel({ products, transferDiscountPercent }: Props) {
  if (!products.length) return null;

  const [paused, setPaused] = useState(false);
  const duration = useMemo(() => `${Math.max(18, products.length * 4)}s`, [products.length]);

  const track = useMemo(() => [...products, ...products], [products]);

  return (
    <section className="app-container space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Carrusel infinito</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Productos que se desplazan suavemente. MantenÃ© pulsado o ponÃ© el mouse encima para detenerlos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="btn-secondary flex items-center gap-2 px-3 py-2"
          aria-pressed={paused}
        >
          <Icon icon={paused ? Play : Pause} className="h-4 w-4" />
          {paused ? "Reanudar" : "Pausar"}
        </button>
      </div>

      <div
        className="product-marquee rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/80"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="product-marquee-track" style={{ animationDuration: duration, animationPlayState: paused ? "paused" : "running" }}>
          {track.map((product, idx) => (
            <div className="product-marquee-item" key={`${product.id}-${idx}`}>
              <ProductCard product={product} transferDiscountPercent={transferDiscountPercent} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
