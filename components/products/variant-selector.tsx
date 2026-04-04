"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductVariant } from "@/types/domain";

export type SelectedVariant = {
  variantId: string | null;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
};

type Props = {
  variants: ProductVariant[];
  basePrice: number;
  baseStock: number;
  onChange: (selected: SelectedVariant) => void;
};

function uniq(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

export function VariantSelector({ variants, basePrice, baseStock, onChange }: Props) {
  const hasVariants = variants.length > 0;

  const byKey = useMemo(() => {
    const map = new Map<string, ProductVariant>();
    for (const v of variants) {
      const key = `${v.size}__${v.color}`.toLowerCase();
      map.set(key, v);
    }
    return map;
  }, [variants]);

  const sizes = useMemo(() => uniq(variants.map((v) => v.size)), [variants]);

  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const colorsForSize = useMemo(() => {
    if (!size) return [];
    return uniq(variants.filter((v) => v.size === size).map((v) => v.color));
  }, [variants, size]);

  const [color, setColor] = useState<string | null>(colorsForSize[0] ?? null);

  useEffect(() => {
    if (!size) return;
    if (colorsForSize.length === 0) {
      setColor(null);
      return;
    }
    if (color && colorsForSize.includes(color)) return;
    setColor(colorsForSize[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, colorsForSize.join("|")]);

  const selected = useMemo<SelectedVariant>(() => {
    if (!hasVariants || !size || !color) {
      return {
        variantId: null,
        size: null,
        color: null,
        price: basePrice,
        stock: baseStock,
      };
    }

    const v = byKey.get(`${size}__${color}`.toLowerCase()) ?? null;
    return {
      variantId: v?.id ?? null,
      size,
      color,
      price: v?.price !== null && v?.price !== undefined ? Number(v.price) : basePrice,
      stock: v ? Number(v.stock) : 0,
    };
  }, [hasVariants, size, color, byKey, basePrice, baseStock]);

  useEffect(() => {
    onChange(selected);
  }, [selected, onChange]);

  if (!hasVariants) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Talle</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sizes.map((s) => {
            const inStockForSize = variants
              .filter((v) => v.size === s)
              .some((v) => Number(v.stock) > 0);
            const active = s === size;
            return (
              <button
                key={s}
                type="button"
                className={[
                  "border px-3.5 py-2.5 text-sm font-semibold uppercase transition",
                  active ? "border-black bg-black text-white" : "border-slate-300 bg-white text-slate-900 hover:border-black",
                  !inStockForSize ? "opacity-50" : "",
                ].join(" ")}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Color</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {colorsForSize.map((c) => {
            const v = byKey.get(`${size ?? ""}__${c}`.toLowerCase()) ?? null;
            const inStock = (v?.stock ?? 0) > 0;
            const active = c === color;
            return (
              <button
                key={c}
                type="button"
                className={[
                  "border px-3.5 py-2.5 text-sm font-semibold uppercase transition",
                  active ? "border-black bg-black text-white" : "border-slate-300 bg-white text-slate-900 hover:border-black",
                  !inStock ? "opacity-50" : "",
                ].join(" ")}
                onClick={() => setColor(c)}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
