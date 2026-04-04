"use client";

import { useEffect, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { CartItemRow } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCartStore } from "@/lib/cart/store";
import type { CartStoredLineItem } from "@/lib/cart/utils";
import { Package2, ShoppingCart, X } from "lucide-react";

function LoadingOverlay() {
  const dots = Array.from({ length: 3 });
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-[28px]" role="status" aria-live="polite">
      <div className="loading-overlay__card">
        <p className="loading-overlay__label">Cargando carrito...</p>
        <div className="loading-overlay__dots" aria-hidden="true">
          {dots.map((_, index) => (
            <span
              key={index}
              className="loading-overlay__dot"
              style={{ animationDelay: `${index * 0.14}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

export function CartDrawer() {
  const toast = useToast();

  const open = useCartStore((s) => s.drawerOpen);
  const close = useCartStore((s) => s.closeDrawer);
  const items = useCartStore((s) => s.items);
  const totalQty = useCartStore((s) => s.totals.totalQuantity);
  const canCheckout = useCartStore((s) => s.canCheckout);
  const validationState = useCartStore((s) => s.validationState);
  const syncState = useCartStore((s) => s.syncState);

  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const validateAgainstSupabase = useCartStore((s) => s.validateAgainstSupabase);
  const initAuthSyncListener = useCartStore((s) => s.initAuthSyncListener);

  const busy = validationState === "validating" || syncState === "syncing";

  useEffect(() => {
    const unsubscribe = initAuthSyncListener();
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on escape.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Light validation when the drawer opens (best-effort, cached prices/stock).
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const result = await validateAgainstSupabase();
      if (!result.ok) {
        toast.push({ variant: "info", title: "Carrito", description: result.reason });
      }
    })();
  }, [open, validateAgainstSupabase, toast]);

  const headerSubtitle = useMemo(() => {
    if (items.length === 0) return "Tu carrito está vacío";
    const plural = totalQty === 1 ? "producto" : "productos";
    return `${totalQty} ${plural}`;
  }, [items.length, totalQty]);

  const { standaloneItems, bundleGroups } = useMemo(() => {
    const bundleMap = new Map<string, CartStoredLineItem[]>();
    const standalone: CartStoredLineItem[] = [];

    items.forEach((item) => {
      if (item.bundleGroupId) {
        const existing = bundleMap.get(item.bundleGroupId);
        if (existing) {
          existing.push(item);
        } else {
          bundleMap.set(item.bundleGroupId, [item]);
        }
      } else {
        standalone.push(item);
      }
    });

    return {
      standaloneItems: standalone,
      bundleGroups: Array.from(bundleMap.entries()),
    };
  }, [items]);

  const hasVisibleItems = standaloneItems.length > 0 || bundleGroups.length > 0;

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-slate-950/60 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => close()}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-soft transition-transform duration-200 dark:bg-slate-950 sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon icon={ShoppingCart} />
              <h2 className="truncate text-base font-black text-slate-900 dark:text-slate-50">Carrito</h2>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{headerSubtitle}</p>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 hover:border-slate-900 dark:border-slate-800 dark:hover:border-slate-200"
            onClick={() => close()}
            aria-label="Cerrar"
          >
            <Icon icon={X} />
          </button>
        </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 relative">
            {busy && <LoadingOverlay />}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {!hasVisibleItems ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  Tu carrito está vacío.
                </div>
              ) : (
                <>
                  {standaloneItems.map((item) => (
                    <CartItemRow
                      key={`${item.productId}-${item.variantId ?? "base"}`}
                      item={item}
                      disabled={busy}
                      onDecrease={() =>
                        updateQuantity(item.productId, item.quantity - 1, item.variantId)
                      }
                      onIncrease={() =>
                        updateQuantity(item.productId, item.quantity + 1, item.variantId)
                      }
                      onRemove={() => removeFromCart(item.productId, item.variantId)}
                    />
                  ))}

                  {bundleGroups.map(([groupId, bundleItems]) => (
                    <div
                      key={groupId}
                      className="space-y-2 rounded-2xl border border-indigo-200/60 bg-indigo-50/20 p-3 dark:border-indigo-800/60 dark:bg-indigo-950/30"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        <span className="flex items-center gap-1 text-xs font-semibold">
                          <Icon icon={Package2} size={14} />
                          Bundle ({bundleItems.length} productos)
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {formatMoney(
                            bundleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
                          )}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {bundleItems.map((item) => (
                          <CartItemRow
                            key={`${item.productId}-${item.variantId ?? "base"}`}
                            item={item}
                            disabled={busy}
                            onDecrease={() =>
                              updateQuantity(item.productId, item.quantity - 1, item.variantId)
                            }
                            onIncrease={() =>
                              updateQuantity(item.productId, item.quantity + 1, item.variantId)
                            }
                            onRemove={() => removeFromCart(item.productId, item.variantId)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

          <div className="flex-none">
            <CartSummary />
            {!canCheckout && items.length > 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                Checkout deshabilitado: hay productos sin stock o no disponibles.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
