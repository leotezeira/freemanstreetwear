import { TRANSFER_DISCOUNT_PERCENT } from "@/lib/config/pricing";

export function clampTransferDiscountPercent(value?: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return TRANSFER_DISCOUNT_PERCENT;
  return Math.max(0, Math.min(100, num));
}

export function calculateTransferPrice(price: number, discountPercent?: number) {
  if (!Number.isFinite(price)) return price;
  const percent = clampTransferDiscountPercent(discountPercent);
  return Math.round(price * (1 - percent / 100));
}

export function calculateTransferSubtotal(
  items: Array<{ unitPrice: number; quantity: number }>,
  discountPercent?: number
) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + calculateTransferPrice(item.unitPrice, discountPercent) * item.quantity, 0);
}
