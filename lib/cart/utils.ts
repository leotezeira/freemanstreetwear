export type CartLineKeyInput = {
  productId: string;
  variantId?: string | null;
  bundleGroupId?: string | null;
  bundleId?: string | null;
};

export type CartStoredLineItem = {
  productId: string;
  variantId: string | null;

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

  // Bundle metadata (optional)
  bundleId?: string | null;
  bundleGroupId?: string | null;
};

function resolveBundleGroupId(input: Pick<CartLineKeyInput, "bundleGroupId" | "bundleId">) {
  return input.bundleGroupId ?? input.bundleId ?? null;
}

export function normalizeCartItem(item: CartStoredLineItem): CartStoredLineItem {
  const canonicalGroupId = resolveBundleGroupId(item);
  if ((item.bundleGroupId ?? null) === canonicalGroupId) {
    return item;
  }
  return {
    ...item,
    bundleGroupId: canonicalGroupId,
  };
}

export function cartLineKey(input: CartLineKeyInput) {
  const bundleGroupId = resolveBundleGroupId(input);
  return `${input.productId}::${input.variantId ?? ""}::${bundleGroupId ?? ""}`;
}

export function sameCartLine(a: CartLineKeyInput, b: CartLineKeyInput) {
  return (
    a.productId === b.productId &&
    (a.variantId ?? null) === (b.variantId ?? null) &&
    resolveBundleGroupId(a) === resolveBundleGroupId(b)
  );
}

export function clampQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

export function mergeCartItems(
  a: CartStoredLineItem[],
  b: CartStoredLineItem[]
): CartStoredLineItem[] {
  const map = new Map<string, CartStoredLineItem>();

  for (const rawItem of a) {
    const item = normalizeCartItem(rawItem);
    map.set(cartLineKey(item), { ...item, quantity: clampQuantity(item.quantity) });
  }

  for (const rawItem of b) {
    const item = normalizeCartItem(rawItem);
    const key = cartLineKey(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, quantity: clampQuantity(item.quantity) });
      continue;
    }

    const merged: CartStoredLineItem = {
      ...existing,
      ...item,
      quantity: clampQuantity(existing.quantity + clampQuantity(item.quantity)),
      name: item.name || existing.name,
      variantLabel: item.variantLabel ?? existing.variantLabel ?? null,
      unitPrice: Number.isFinite(item.unitPrice) ? item.unitPrice : existing.unitPrice,
      compareAtPrice: item.compareAtPrice ?? existing.compareAtPrice ?? null,
      imageUrl: item.imageUrl ?? existing.imageUrl ?? null,
      stock: item.stock ?? existing.stock ?? null,
      isActive: item.isActive ?? existing.isActive ?? null,
      weight_grams: item.weight_grams ?? existing.weight_grams ?? null,
      height: item.height ?? existing.height ?? null,
      width: item.width ?? existing.width ?? null,
      length: item.length ?? existing.length ?? null,
      bundleId: item.bundleId ?? existing.bundleId ?? null,
    };

    map.set(key, normalizeCartItem(merged));
  }

  return Array.from(map.values());
}

export function computeSubtotal(items: CartStoredLineItem[]) {
  return items.reduce((acc, it) => acc + Number(it.unitPrice) * Number(it.quantity), 0);
}

export function computeTotalQuantity(items: CartStoredLineItem[]) {
  return items.reduce((acc, it) => acc + Number(it.quantity), 0);
}

export function computeSavings(items: CartStoredLineItem[]) {
  return items.reduce((acc, it) => {
    const compareAt = Number(it.compareAtPrice ?? 0);
    const price = Number(it.unitPrice);
    if (!Number.isFinite(compareAt) || compareAt <= price) return acc;
    return acc + (compareAt - price) * Number(it.quantity);
  }, 0);
}

export type ExpiringJson = {
  expiresAt: number;
  value: string;
};

export function createExpiringStorage(opts: { keyPrefix: string; ttlDays: number }) {
  const ttlMs = Math.max(1, opts.ttlDays) * 24 * 60 * 60 * 1000;

  return {
    getItem: (name: string) => {
      try {
        const raw = window.localStorage.getItem(`${opts.keyPrefix}${name}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ExpiringJson;
        if (!parsed?.expiresAt || typeof parsed.value !== "string") return null;
        if (Date.now() > Number(parsed.expiresAt)) {
          window.localStorage.removeItem(`${opts.keyPrefix}${name}`);
          return null;
        }
        return parsed.value;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        const payload: ExpiringJson = {
          expiresAt: Date.now() + ttlMs,
          value,
        };
        window.localStorage.setItem(`${opts.keyPrefix}${name}`, JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    removeItem: (name: string) => {
      try {
        window.localStorage.removeItem(`${opts.keyPrefix}${name}`);
      } catch {
        // ignore
      }
    },
  };
}
