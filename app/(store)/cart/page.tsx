"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { CartItemRow } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCartStore } from "@/lib/cart/store";

export default function CartPage() {
  const toast = useToast();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const validate = useCartStore((s) => s.validateAgainstSupabase);

  useEffect(() => {
    void (async () => {
      const result = await validate();
      if (!result.ok) {
        toast.push({ variant: "info", title: "Carrito", description: result.reason });
      }
    })();
  }, [toast, validate]);

  return (
    <main className="app-container py-10">
      <h1 className="text-3xl font-black tracking-tight">Carrito</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {items.map((item) => (
            <CartItemRow
              key={`${item.productId}-${item.variantId ?? "base"}`}
              item={item}
              onDecrease={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
              onIncrease={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
              onRemove={() => removeFromCart(item.productId, item.variantId)}
            />
          ))}

          {items.length === 0 && <p className="text-sm text-slate-500">Tu carrito está vacío.</p>}
        </section>

        <CartSummary />
      </div>
    </main>
  );
}
