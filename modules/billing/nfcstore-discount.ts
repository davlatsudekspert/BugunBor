/**
 * The single place a NFCStore-verified business's plan price gets discounted — every surface
 * that shows or would charge a plan price (business dashboard, admin's business list, admin's
 * MRR total) calls this instead of computing `* 0.9` itself, so they can never drift apart.
 * There is no live checkout/invoice flow in this app yet (a business's plan is assigned
 * manually by an admin — see POST /api/v1/admin/businesses/:id/plan); this function is what
 * that flow, and any future real one, must read the price from.
 */
export const NFCSTORE_BUSINESS_DISCOUNT_PERCENT = 10;

export type PlanPrice = {
  basePriceUzs: number;
  discountPercent: number;
  discountUzs: number;
  finalPriceUzs: number;
};

/** `discountEligible` should come from `businesses.nfcstore_discount_eligible` — true only
 * while `nfcstore_status = 'VERIFIED'` (see modules/integrations/nfcstore-verification.ts and
 * the admin decision route that flips it). Never derive eligibility from anything client-sent. */
export function computeEffectivePlanPriceUzs(basePriceUzs: number, discountEligible: boolean): PlanPrice {
  if (!discountEligible) return { basePriceUzs, discountPercent: 0, discountUzs: 0, finalPriceUzs: basePriceUzs };
  const discountUzs = Math.round((basePriceUzs * NFCSTORE_BUSINESS_DISCOUNT_PERCENT) / 100);
  return { basePriceUzs, discountPercent: NFCSTORE_BUSINESS_DISCOUNT_PERCENT, discountUzs, finalPriceUzs: basePriceUzs - discountUzs };
}
