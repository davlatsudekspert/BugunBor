import { describe, expect, it } from 'vitest';

import { NOW, SECRET, marketplace } from '@/test/fixtures';
import { codeFromScan, normalizeRedemptionCode } from './codes';
import { cancelRedemption, claimDeal, completeRedemption, expireStaleRedemptions, listCustomerRedemptions, lookupRedemption } from './service';

const claim = (db: D1Database, userId: string, key: string, extra: Partial<Parameters<typeof claimDeal>[1]> = {}) =>
  claimDeal(db, { dealId: 'deal', branchId: 'br1', userId, idempotencyKey: key, secret: SECRET, now: NOW, ...extra });

const remaining = async (db: D1Database) => db.prepare(`SELECT remaining_quantity FROM deals WHERE id = 'deal'`).first<number>('remaining_quantity');
const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string; message?: string }) => error.code ?? error.message ?? 'UNKNOWN');

describe('claiming a deal', () => {
  it('issues a 6-character code, decrements stock and replays idempotently', async () => {
    const db = await marketplace();
    const first = await claim(db, 'alice', 'key-alice-000001');
    expect(first.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(first.expiresAt).toBe('2026-09-25 11:00:00');
    expect(await remaining(db)).toBe(1);

    const replay = await claim(db, 'alice', 'key-alice-000001');
    expect(replay).toEqual({ ...first, replayed: true });
    expect(await remaining(db)).toBe(1);
    expect(await errorCode(claim(db, 'bob', 'key-alice-000001'))).toBe('CONFLICT');
  });

  it('allows one active code per customer and enforces the per-customer limit', async () => {
    const db = await marketplace();
    await claim(db, 'alice', 'key-alice-000001');
    expect(await errorCode(claim(db, 'alice', 'key-alice-000002'))).toBe('ALREADY_CLAIMED');
  });

  it('never sells more units than exist', async () => {
    const db = await marketplace();
    await claim(db, 'alice', 'key-alice-000001');
    await claim(db, 'bob', 'key-bob-00000001');
    expect(await remaining(db)).toBe(0);
    expect(await errorCode(claim(db, 'stranger', 'key-strange-0001'))).toBe('SOLD_OUT');
    expect(await remaining(db)).toBe(0);
  });

  it('rejects branches outside the deal, suspended businesses and ended deals', async () => {
    const db = await marketplace();
    expect(await errorCode(claim(db, 'alice', 'key-alice-000001', { branchId: 'brx' }))).toBe('BRANCH_UNAVAILABLE');
    expect(await errorCode(claim(db, 'alice', 'key-alice-000002', { now: new Date(NOW.getTime() + 3 * 3600_000) }))).toBe('DEAL_EXPIRED');
    await db.prepare(`UPDATE businesses SET suspended_at = '2026-09-25 09:00:00' WHERE id = 'biz'`).run();
    expect(await errorCode(claim(db, 'alice', 'key-alice-000003'))).toBe('BUSINESS_UNAVAILABLE');
  });

  it('returns the unit when a code is cancelled or expires', async () => {
    const db = await marketplace();
    const alice = await claim(db, 'alice', 'key-alice-000001');
    await claim(db, 'bob', 'key-bob-00000001');
    await cancelRedemption(db, { redemptionId: alice.id, userId: 'alice', now: NOW });
    expect(await remaining(db)).toBe(1);
    expect(await errorCode(cancelRedemption(db, { redemptionId: alice.id, userId: 'alice', now: NOW }))).toBe('INVALID_TRANSITION');

    await expireStaleRedemptions(db, new Date(NOW.getTime() + 61 * 60_000));
    expect(await remaining(db)).toBe(2);
    const statuses = await db.prepare(`SELECT user_id AS userId, status FROM redemptions ORDER BY user_id`).all();
    expect(statuses.results).toEqual([{ userId: 'alice', status: 'CANCELED' }, { userId: 'bob', status: 'EXPIRED' }]);
  });

  it('shows the active code again in "My codes"', async () => {
    const db = await marketplace();
    const result = await claim(db, 'alice', 'key-alice-000001');
    const [row] = await listCustomerRedemptions(db, 'alice', SECRET, NOW);
    expect(row).toMatchObject({ id: result.id, status: 'CLAIMED', code: result.code, dealTitle: 'Osh', branchName: 'Markaz' });
    const [later] = await listCustomerRedemptions(db, 'alice', SECRET, new Date(NOW.getTime() + 2 * 3600_000));
    expect(later).toMatchObject({ status: 'EXPIRED', code: null });
  });
});

describe('staff validation', () => {
  it('looks up a code only within its business and completes it once', async () => {
    const db = await marketplace();
    const { id, code } = await claim(db, 'alice', 'key-alice-000001');

    expect(await errorCode(lookupRedemption(db, { businessId: 'other', code, secret: SECRET, now: NOW }))).toBe('CODE_NOT_FOUND');
    const found = await lookupRedemption(db, { businessId: 'biz', code, secret: SECRET, now: NOW });
    expect(found).toMatchObject({ id, dealTitle: 'Osh', price: 30000, customerName: 'Alice Karimova' });

    await completeRedemption(db, { businessId: 'biz', redemptionId: id, staffUserId: 'cashier', now: NOW });
    expect(await errorCode(completeRedemption(db, { businessId: 'biz', redemptionId: id, staffUserId: 'cashier', now: NOW }))).toBe('CODE_USED');
    expect(await errorCode(lookupRedemption(db, { businessId: 'biz', code, secret: SECRET, now: NOW }))).toBe('CODE_USED');
    const audits = await db.prepare(`SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'redemption.completed'`).first<number>('n');
    expect(audits).toBe(1);
  });

  it('refuses expired codes', async () => {
    const db = await marketplace();
    const { code, id } = await claim(db, 'alice', 'key-alice-000001');
    const later = new Date(NOW.getTime() + 61 * 60_000);
    expect(await errorCode(lookupRedemption(db, { businessId: 'biz', code, secret: SECRET, now: later }))).toBe('CODE_EXPIRED');
    expect(await errorCode(completeRedemption(db, { businessId: 'biz', redemptionId: id, staffUserId: 'cashier', now: later }))).toBe('CODE_EXPIRED');
  });

  it('parses typed and scanned codes', () => {
    expect(normalizeRedemptionCode(' k7p 2qx ')).toBe('K7P2QX');
    expect(normalizeRedemptionCode('K7P2Q0')).toBeNull();
    expect(codeFromScan('https://bugunbor.uz/r/K7P2QX')).toBe('K7P2QX');
    expect(codeFromScan('https://bugunbor.uz/business/redeem?code=k7p2qx')).toBe('K7P2QX');
  });
});
