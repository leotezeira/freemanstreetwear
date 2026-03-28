"use client";

import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";
import {
  clampQuantity,
  computeSavings,
  computeSubtotal,
  computeTotalQuantity,
  createExpiringStorage,
  mergeCartItems,
  sameCartLine,
  type CartStoredLineItem,
} from "@/lib/cart/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type SyncState = "idle" | "syncing" | "error";
type ValidationState = "idle" | "validating" | "error";

export type AddToCartInput = {
  productId: string;
  variantId?: string | null;
  name: string;
  variantLabel?: string | null;
  unitPrice: number;
  compareAtPrice?: number | null;
  quantity: number;
  imageUrl?: string | null;
  stock?: number | null;
  isActive?: boolean | null;
  weight_grams?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
  bundleId?: string | null;
  bundleGroupId?: string | null;
};

export type CartTotals = {
  subtotal: number;
  totalQuantity: number;
  savings: number;
};

export type CartShippingEstimate = {
  postalCode: string;
  price: number;
  updatedAt: number;
} | null;

type CartState = {
  items: CartStoredLineItem[];
  drawerOpen: boolean;

  shippingEstimate: CartShippingEstimate;

  syncState: SyncState;
  validationState: ValidationState;
  lastSyncedAt: number | null;
  lastValidatedAt: number | null;

  totals: CartTotals;
  canCheckout: boolean;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  addToCart: (input: AddToCartInput) => { ok: true; clamped: boolean } | { ok: false; reason: string };
  removeFromCart: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  clearCart: () => void;

  setShippingEstimate: (estimate: CartShippingEstimate) => void;

  validateAgainstSupabase: () => Promise<{ ok: true } | { ok: false; reason: string }>;
  syncToSupabaseIfLoggedIn: () => Promise<void>;
  loadAndMergeSupabaseCartIfLoggedIn: () => Promise<void>;
  initAuthSyncListener: () => () => void;
};

function computeDerivedState(items: CartStoredLineItem[], _shippingEstimate: CartShippingEstimate) {
  const subtotal = computeSubtotal(items);
  const totalQuantity = computeTotalQuantity(items);
  const savings = computeSavings(items);

  const hasInactive = items.some((it) => it.isActive === false);
  const hasNoStock = items.some((it) => typeof it.stock === "number" && it.stock <= 0);
  const exceedsStock = items.some((it) => typeof it.stock === "number" && it.quantity > it.stock);

  const canCheckout = items.length > 0 && !hasInactive && !hasNoStock && !exceedsStock;

  return {
    totals: { subtotal, totalQuantity, savings },
    canCheckout,
  };
}

function normalizeItem(input: AddToCartInput): CartStoredLineItem {
  return {
    productId: input.productId,
    variantId: input.variantId ?? null,
    name: input.name,
    variantLabel: input.variantLabel ?? null,
    unitPrice: Number(input.unitPrice),
    compareAtPrice: input.compareAtPrice ?? null,
    quantity: clampQuantity(input.quantity),
    imageUrl: input.imageUrl ?? null,
    stock: input.stock ?? null,
    isActive: input.isActive ?? null,
    weight_grams: input.weight_grams ?? null,
    height: input.height ?? null,
    width: input.width ?? null,
    length: input.length ?? null,
    bundleId: input.bundleId ?? null,
    bundleGroupId: input.bundleGroupId ?? null,
  };
}

function upsertLineItem(items: CartStoredLineItem[], incoming: CartStoredLineItem) {
  const existing = items.find((it) => sameCartLine(it, incoming));
  if (!existing) return [...items, incoming];

  const desiredQty = clampQuantity(existing.quantity + incoming.quantity);
  const maxStock = typeof existing.stock === "number" ? existing.stock : null;
  const finalQty = typeof maxStock === "number" ? Math.min(desiredQty, Math.max(0, maxStock)) : desiredQty;

  return items.map((it) => (sameCartLine(it, incoming) ? { ...it, ...incoming, quantity: Math.max(1, finalQty) } : it));
}

const STORAGE_NAME = "freeman_cart_zustand_v1";
const expiringStorage = createExpiringStorage({ keyPrefix: "", ttlDays: 7 });

export const useCartStore = create<CartState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        items: [],
        drawerOpen: false,
        shippingEstimate: null,
        syncState: "idle",
        validationState: "idle",
        lastSyncedAt: null,
        lastValidatedAt: null,
        totals: { subtotal: 0, totalQuantity: 0, savings: 0 },
        canCheckout: false,

        openDrawer: () => set({ drawerOpen: true }),
        closeDrawer: () => set({ drawerOpen: false }),
        toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

        addToCart: (input) => {
          const incoming = normalizeItem(input);
          if (!incoming.productId) return { ok: false, reason: "Producto inválido" };
          if (!Number.isFinite(incoming.unitPrice) || incoming.unitPrice < 0) {
            return { ok: false, reason: "Precio inválido" };
          }

          const before = get().items;
          const next = upsertLineItem(before, incoming);

          // Detect clamp (only when stock is known).
          const clamped = next.some((it) => {
            const was = before.find((b) => sameCartLine(b, it));
            if (!was) return false;
            const stock = typeof it.stock === "number" ? it.stock : null;
            if (stock === null) return false;
            const desired = clampQuantity(was.quantity + incoming.quantity);
            return it.quantity !== Math.min(desired, Math.max(0, stock));
          });

          const derived = computeDerivedState(next, get().shippingEstimate);
          set({ items: next, ...derived });
          return { ok: true, clamped };
        },

        removeFromCart: (productId, variantId) => {
          const prev = get().items;
          const next = prev.filter((it) => {
            if (it.productId !== productId) return true;
            if (variantId === undefined) return false; // remove all variants for product
            return (it.variantId ?? null) !== (variantId ?? null);
          });
          const derived = computeDerivedState(next, get().shippingEstimate);
          set({ items: next, ...derived });
        },

        updateQuantity: (productId, quantity, variantId) => {
          const nextQty = clampQuantity(quantity);
          const prev = get().items;
          const next = prev.map((it) => {
            if (it.productId !== productId) return it;
            if (variantId !== undefined && (it.variantId ?? null) !== (variantId ?? null)) return it;

            const stock = typeof it.stock === "number" ? it.stock : null;
            const finalQty = typeof stock === "number" ? Math.min(nextQty, Math.max(1, stock)) : nextQty;
            return { ...it, quantity: finalQty };
          });

          const derived = computeDerivedState(next, get().shippingEstimate);
          set({ items: next, ...derived });
        },

        clearCart: () => {
          const derived = computeDerivedState([], get().shippingEstimate);
          set({ items: [], ...derived });
        },

        setShippingEstimate: (estimate) => {
          const derived = computeDerivedState(get().items, estimate);
          set({ shippingEstimate: estimate, ...derived });
        },

        validateAgainstSupabase: async () => {
          const items = get().items;
          if (items.length === 0) return { ok: false, reason: "El carrito está vacío" };

          const lastValidatedAt = get().lastValidatedAt;
          if (typeof lastValidatedAt === "number" && Date.now() - lastValidatedAt < 2 * 60 * 1000) {
            const derived = computeDerivedState(items, get().shippingEstimate);
            if (derived.canCheckout) return { ok: true };
          }

          set({ validationState: "validating" });

          try {
            const supabase = getSupabaseBrowserClient();
            const ids = Array.from(new Set(items.map((it) => it.productId)));

            const selectWithDims =
              "id, price, compare_at_price, stock, is_active, name, image_url, weight_grams, height, width, length";
            const selectNoDims =
              "id, price, compare_at_price, stock, is_active, name, image_url, weight_grams";

            let { data, error } = await supabase.from("products").select(selectWithDims).in("id", ids);

            if (error) {
              const msg = String(error.message ?? "").toLowerCase();
              const missingDims = msg.includes("height") || msg.includes("width") || msg.includes("length");
              if (missingDims) {
                const retry = await supabase.from("products").select(selectNoDims).in("id", ids);
                data = retry.data as any;
                error = retry.error as any;
              }
            }

            if (error) throw new Error(error.message);
            const byId = new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));

            const next = items.map((it) => {
              const p = byId.get(it.productId);
              if (!p) {
                return { ...it, isActive: false, stock: 0 };
              }
              return {
                ...it,
                name: typeof p.name === "string" ? p.name : it.name,
                unitPrice: Number(p.price),
                compareAtPrice: p.compare_at_price ?? it.compareAtPrice ?? null,
                stock: typeof p.stock === "number" ? p.stock : it.stock ?? null,
                isActive: typeof p.is_active === "boolean" ? p.is_active : it.isActive ?? null,
                imageUrl: p.image_url ?? it.imageUrl ?? null,
                weight_grams: p.weight_grams ?? it.weight_grams ?? null,
                height: p.height ?? it.height ?? null,
                width: p.width ?? it.width ?? null,
                length: p.length ?? it.length ?? null,
                bundleId: it.bundleId ?? null,
                bundleGroupId: it.bundleGroupId ?? null,
              };
            });

            // Clamp quantities to current stock when available.
            const clamped = next.map((it) => {
              const stock = typeof it.stock === "number" ? it.stock : null;
              if (typeof stock === "number") {
                return { ...it, quantity: Math.min(it.quantity, Math.max(0, stock)) };
              }
              return it;
            });

            // Remove any lines that became 0 after clamp.
            const finalItems = clamped.filter((it) => it.quantity > 0);
            const derived = computeDerivedState(finalItems, get().shippingEstimate);

            set({ items: finalItems, validationState: "idle", lastValidatedAt: Date.now(), ...derived });

            if (!derived.canCheckout) {
              return { ok: false, reason: "Hay productos sin stock o no disponibles" };
            }
            return { ok: true };
          } catch (e) {
            const msg = e instanceof Error ? e.message : "No se pudo validar el carrito";
            set({ validationState: "error" });
            return { ok: false, reason: msg };
          }
        },

        syncToSupabaseIfLoggedIn: async () => {
          try {
            const supabase = getSupabaseBrowserClient();
            const { data } = await supabase.auth.getUser();
            const userId = data.user?.id;
            if (!userId) return;

            set({ syncState: "syncing" });
            const payload = {
              user_id: userId,
              items: get().items,
              updated_at: new Date().toISOString(),
            };
            const { error } = await supabase.from("carts").upsert(payload, { onConflict: "user_id" });
            if (error) throw new Error(error.message);
            set({ syncState: "idle", lastSyncedAt: Date.now() });
          } catch {
            // If carts table/policies are not available yet, don't block UX.
            set({ syncState: "error" });
          }
        },

        loadAndMergeSupabaseCartIfLoggedIn: async () => {
          try {
            const supabase = getSupabaseBrowserClient();
            const { data } = await supabase.auth.getUser();
            const userId = data.user?.id;
            if (!userId) return;

            set({ syncState: "syncing" });
            const { data: row, error } = await supabase
              .from("carts")
              .select("items")
              .eq("user_id", userId)
              .maybeSingle();

            if (error) throw new Error(error.message);

            const remoteItems = (row?.items ?? []) as CartStoredLineItem[];
            const merged = mergeCartItems(remoteItems, get().items);
            const derived = computeDerivedState(merged, get().shippingEstimate);
            set({ items: merged, ...derived });

            // Best-effort: persist merged cart.
            await get().syncToSupabaseIfLoggedIn();
            set({ syncState: "idle", lastSyncedAt: Date.now() });
          } catch {
            set({ syncState: "error" });
          }
        },

        initAuthSyncListener: () => {
          const supabase = getSupabaseBrowserClient();

          // On mount, attempt merge if already logged in.
          void get().loadAndMergeSupabaseCartIfLoggedIn();

          const { data } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
              void get().loadAndMergeSupabaseCartIfLoggedIn();
              return;
            }
            if (event === "SIGNED_OUT") {
              // Keep local cart.
              return;
            }
          });

          return () => {
            data.subscription.unsubscribe();
          };
        },
      }),
      {
        name: STORAGE_NAME,
        version: 1,
        storage: createJSONStorage(() => expiringStorage),
        partialize: (state) => ({
          items: state.items,
          shippingEstimate: state.shippingEstimate,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          const derived = computeDerivedState(state.items, state.shippingEstimate);
          state.totals = derived.totals;
          state.canCheckout = derived.canCheckout;
        },
      }
    )
  )
);
