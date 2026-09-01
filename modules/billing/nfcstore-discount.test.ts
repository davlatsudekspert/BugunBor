import { describe, expect, it } from 'vitest';

import { computeEffectivePlanPriceUzs } from './nfcstore-discount';

describe('computeEffectivePlanPriceUzs', () => {
  it('applies no discount when not eligible', () => {
    expect(computeEffectivePlanPriceUzs(199_000, false)).toEqual({
      basePriceUzs: 199_000,
      discountPercent: 0,
      discountUzs: 0,
      finalPriceUzs: 199_000,
    });
  });

  it('applies exactly 10% when eligible', () => {
    expect(computeEffectivePlanPriceUzs(199_000, true)).toEqual({
      basePriceUzs: 199_000,
      discountPercent: 10,
      discountUzs: 19_900,
      finalPriceUzs: 179_100,
    });
  });

  it('rounds the discount rather than leaving fractional so‘m', () => {
    const result = computeEffectivePlanPriceUzs(100_005, true);
    expect(result.discountUzs).toBe(Math.round(10_000.5));
    expect(result.finalPriceUzs).toBe(result.basePriceUzs - result.discountUzs);
  });

  it('a free plan stays free either way', () => {
    expect(computeEffectivePlanPriceUzs(0, true).finalPriceUzs).toBe(0);
  });
});
