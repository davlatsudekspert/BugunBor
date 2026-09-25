// Pure pricing helpers shared by the billing page (client) and the service (server).

/** Paid periods on offer, with a small discount for paying ahead. */
export const BILLING_PERIODS = [
  { months: 1, discountPercent: 0 },
  { months: 3, discountPercent: 5 },
  { months: 6, discountPercent: 10 },
  { months: 12, discountPercent: 15 },
] as const;

export const TRIAL_MONTH_OPTIONS = [1, 2, 3] as const;

/** Total for a period, rounded to 1 000 so'm; null for an unknown period. */
export function periodPrice(priceMonthlyUzs: number, months: number) {
  const period = BILLING_PERIODS.find((item) => item.months === months);
  if (!period) return null;
  return Math.round((priceMonthlyUzs * months * (100 - period.discountPercent)) / 100 / 1000) * 1000;
}
