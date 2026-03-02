"use client";

import { useState } from "react";
import { QuantitySelector } from "@/components/products/quantity-selector";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/toast";

type ProductActionsProps = {
  productId: string;
  productName: string;
  unitPrice: number;
  compareAtPrice?: number | null;
  stock: number;
  variantId?: string | null;
  variantLabel?: string | null;
  imageUrl?: string | null;
  weight_grams?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
};

export function ProductActions({
  productId,
  productName,
  unitPrice,
  compareAtPrice,
  stock,
  variantId,
  variantLabel,
  imageUrl,
  weight_grams,
  height,
  width,
  length,
}: ProductActionsProps) {
  const toast = useToast();
  const addToCart = useCartStore((s) => s.addToCart);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-600">Cantidad</p>
        <QuantitySelector value={quantity} max={Math.max(1, stock)} onChange={setQuantity} />
      </div>

      <button
        className="btn-primary w-full"
        type="button"
        disabled={stock <= 0}
        onClick={() => {
          const result = addToCart({
            productId,
            variantId: variantId ?? null,
            name: productName,
            variantLabel: variantLabel ?? null,
            unitPrice,
            compareAtPrice: compareAtPrice ?? null,
            quantity,
            imageUrl: imageUrl ?? null,
            stock,
            isActive: true,
            weight_grams: weight_grams ?? null,
            height: height ?? null,
            width: width ?? null,
            length: length ?? null,
          });

          if (!result.ok) {
            toast.push({ variant: "error", title: "Carrito", description: result.reason });
            return;
          }

          openDrawer();
          toast.push({
            variant: result.clamped ? "info" : "success",
            title: "Carrito",
            description: result.clamped
              ? "Agregado, pero se ajustó al stock disponible."
              : "Producto agregado al carrito.",
          });
        }}
      >
        {stock > 0 ? "Agregar al carrito" : "Producto no disponible"}
      </button>
    </div>
  );
}
