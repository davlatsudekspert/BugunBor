import { describe, expect, it } from 'vitest';
import { canDeleteDeal, canStopDeal, evaluateDealEditPolicy } from './policy';

const scheduled = {
  status: 'SCHEDULED' as const,
  discountedPriceUzs: 299000,
  totalQuantity: 10,
  endsAt: '2026-08-31T20:00:00.000',
};
const active = {
  status: 'ACTIVE' as const,
  discountedPriceUzs: 299000,
  totalQuantity: 10,
  endsAt: '2026-08-31T20:00:00.000',
};
const unlimitedActive = { ...active, totalQuantity: null };
const expired = {
  status: 'EXPIRED' as const,
  discountedPriceUzs: 299000,
  totalQuantity: 10,
  endsAt: '2026-08-31T20:00:00.000',
};

describe('deal edit policy — before launch', () => {
  it('allows any field change while SCHEDULED', () => {
    expect(
      evaluateDealEditPolicy(scheduled, {
        title: 'Yangi nom',
        discountedPriceUzs: 500000,
        startsAt: '2026-09-01T09:00:00.000',
      }),
    ).toEqual({ ok: true });
  });
});

describe('deal edit policy — LIVE', () => {
  it('allows lowering the price', () =>
    expect(
      evaluateDealEditPolicy(active, { discountedPriceUzs: 250000 }),
    ).toEqual({ ok: true }));
  it('rejects raising the price', () =>
    expect(
      evaluateDealEditPolicy(active, { discountedPriceUzs: 320000 }),
    ).toMatchObject({ ok: false, code: 'PRICE_INCREASE_FORBIDDEN' }));
  it('allows increasing quantity', () =>
    expect(evaluateDealEditPolicy(active, { totalQuantity: 15 })).toEqual({
      ok: true,
    }));
  it('rejects decreasing quantity', () =>
    expect(evaluateDealEditPolicy(active, { totalQuantity: 5 })).toMatchObject({
      ok: false,
      code: 'QUANTITY_DECREASE_FORBIDDEN',
    }));
  it('rejects switching to unlimited quantity', () =>
    expect(
      evaluateDealEditPolicy(active, { totalQuantity: null }),
    ).toMatchObject({ ok: false, code: 'QUANTITY_UNLIMITED_FORBIDDEN' }));
  it('rejects capping an unlimited deal', () =>
    expect(
      evaluateDealEditPolicy(unlimitedActive, { totalQuantity: 5 }),
    ).toMatchObject({ ok: false, code: 'QUANTITY_UNLIMITED_FORBIDDEN' }));
  it('rejects title changes', () =>
    expect(
      evaluateDealEditPolicy(active, { title: 'Boshqa mahsulot' }),
    ).toMatchObject({ ok: false, code: 'CORE_FIELDS_LOCKED' }));
  it('rejects image changes', () =>
    expect(
      evaluateDealEditPolicy(active, { imageUrls: ['https://x/1.jpg'] }),
    ).toMatchObject({ ok: false, code: 'CORE_FIELDS_LOCKED' }));
  it('rejects moving the start time', () =>
    expect(
      evaluateDealEditPolicy(active, { startsAt: '2026-09-01T09:00:00.000' }),
    ).toMatchObject({ ok: false, code: 'STARTS_AT_LOCKED' }));
  it('allows ending earlier', () =>
    expect(
      evaluateDealEditPolicy(active, { endsAt: '2026-08-31T18:00:00.000' }),
    ).toEqual({ ok: true }));
  it('rejects extending the end time', () =>
    expect(
      evaluateDealEditPolicy(active, { endsAt: '2026-08-31T23:00:00.000' }),
    ).toMatchObject({ ok: false, code: 'END_EXTEND_FORBIDDEN' }));
});

describe('deal edit policy — terminal', () => {
  it('rejects any edit once EXPIRED', () =>
    expect(
      evaluateDealEditPolicy(expired, { description: 'yangi tavsif' }),
    ).toMatchObject({ ok: false, code: 'DEAL_TERMINAL' }));
});

describe('delete/stop guards', () => {
  it('allows deleting before launch', () =>
    expect(canDeleteDeal('DRAFT')).toEqual({ ok: true }));
  it('rejects deleting a live deal', () =>
    expect(canDeleteDeal('ACTIVE')).toMatchObject({
      ok: false,
      code: 'DELETE_AFTER_LAUNCH_FORBIDDEN',
    }));
  it('allows stopping a live deal early', () =>
    expect(canStopDeal('ACTIVE')).toEqual({ ok: true }));
  it('rejects stopping a deal that never started', () =>
    expect(canStopDeal('SCHEDULED')).toMatchObject({
      ok: false,
      code: 'STOP_REQUIRES_ACTIVE',
    }));
});
