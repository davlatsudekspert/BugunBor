import { describe, expect, it } from 'vitest';
import { evaluateClaimPolicy, evaluateSlotClaimPolicy } from './policy';

const now = new Date('2026-08-31T10:00:00.000Z');
const base = {
  status: 'ACTIVE',
  startsAt: new Date('2026-08-31T09:00:00.000Z'),
  endsAt: new Date('2026-08-31T11:00:00.000Z'),
  remainingQuantity: 2,
  existingClaims: 0,
  perCustomerLimit: 1,
};

describe('redemption claim policy', () => {
  it('accepts an active eligible deal', () =>
    expect(evaluateClaimPolicy(base, now)).toEqual({ ok: true }));
  it('rejects expiration', () =>
    expect(evaluateClaimPolicy({ ...base, endsAt: now }, now)).toMatchObject({
      ok: false,
      code: 'DEAL_EXPIRED',
    }));
  it('rejects sold out inventory', () =>
    expect(
      evaluateClaimPolicy({ ...base, remainingQuantity: 0 }, now),
    ).toMatchObject({ ok: false, code: 'SOLD_OUT' }));
  it('rejects per-customer duplicates', () =>
    expect(
      evaluateClaimPolicy({ ...base, existingClaims: 1 }, now),
    ).toMatchObject({ ok: false, code: 'LIMIT_REACHED' }));
});

const baseSlot = {
  dealStatus: 'ACTIVE',
  dealStartsAt: new Date('2026-08-31T09:00:00.000Z'),
  dealEndsAt: new Date('2026-08-31T11:00:00.000Z'),
  slotStartsAt: new Date('2026-08-31T10:30:00.000Z'),
  slotRemainingCapacity: 1,
  existingClaims: 0,
  perCustomerLimit: 1,
};

describe('service slot claim policy', () => {
  it('accepts an open upcoming slot', () =>
    expect(evaluateSlotClaimPolicy(baseSlot, now)).toEqual({ ok: true }));
  it('rejects a full slot', () =>
    expect(
      evaluateSlotClaimPolicy({ ...baseSlot, slotRemainingCapacity: 0 }, now),
    ).toMatchObject({ ok: false, code: 'SLOT_FULL' }));
  it('rejects a slot already in the past', () =>
    expect(
      evaluateSlotClaimPolicy(
        { ...baseSlot, slotStartsAt: new Date('2026-08-31T09:30:00.000Z') },
        now,
      ),
    ).toMatchObject({ ok: false, code: 'SLOT_PASSED' }));
  it('rejects an inactive deal', () =>
    expect(
      evaluateSlotClaimPolicy({ ...baseSlot, dealStatus: 'SCHEDULED' }, now),
    ).toMatchObject({ ok: false, code: 'DEAL_NOT_ACTIVE' }));
  it('rejects per-customer duplicates', () =>
    expect(
      evaluateSlotClaimPolicy({ ...baseSlot, existingClaims: 1 }, now),
    ).toMatchObject({ ok: false, code: 'LIMIT_REACHED' }));
});
