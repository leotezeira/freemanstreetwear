export const INSTALLMENT_PLANS = [
  { quantity: 3, minAmount: 0 },
  { quantity: 6, minAmount: 30000 },
  { quantity: 12, minAmount: 80000 },
] as const;

export const TRANSFER_DISCOUNT_PERCENT = 10;

export const BADGE_RULES = {
  NEW_IN_DAYS: 14,
  LAST_UNITS_THRESHOLD: 5,
  DROP_THRESHOLD: 3,
} as const;
