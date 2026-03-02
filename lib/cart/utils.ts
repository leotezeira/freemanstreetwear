export type CartLineKeyInput = {
  productId: string;
  variantId?: string | null;
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
};

export function cartLineKey(input: CartLineKeyInput) {
  return `${input.productId}::${input.variantId ?? ""}`;
}

export function sameCartLine(a: CartLineKeyInput, b: CartLineKeyInput) {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
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

  for (const item of a) {
    map.set(cartLineKey(item), { ...item, quantity: clampQuantity(item.quantity) });
  }

  for (const item of b) {
    const key = cartLineKey(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, quantity: clampQuantity(item.quantity) });
      continue;
    }

    map.set(key, {
      ...existing,
      quantity: clampQuantity(existing.quantity + clampQuantity(item.quantity)),
      // Prefer the freshest metadata if provided.
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
    });
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
