import { describe, expect, it } from 'vitest';

import { listLiveDeals } from '@/modules/catalog/queries';
import { createOrder } from '@/modules/payments/service';
import { NOW, marketplace } from '@/test/fixtures';
import { assertWithinLimit, getBillingSettings, loadSubscription, requestPlan, setTariffsEnabled } from './service';

const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code ?? 'UNKNOWN');
const later = (days: number) => new Date(NOW.getTime() + days * 86_400_000);

describe('free launch (tariffs hidden)', () => {
  it('starts with tariffs hidden and gifts the Premium plan to every verified business, with no end date', async () => {
    const db = await marketplace();
    expect(await getBillingSettings(db)).toMatchObject({ tariffsEnabled: false, freePlan: 'PREMIUM' });
    // Far past the trial: still on air, still free.
    const subscription = await loadSubscription(db, 'biz', later(400));
    expect(subscription).toMatchObject({ status: 'FREE', tariffs: false, endsAt: null });
    expect(subscription.plan?.code).toBe('PREMIUM');
    expect((await listLiveDeals(db, { city: 'tashkent', demo: false, now: new Date(NOW.getTime() + 30 * 60_000) })).some((deal) => deal.id === 'deal')).toBe(true);
    await expect(assertWithinLimit(db, 'biz', 'branches', later(400))).resolves.toBeUndefined();
  });

  it('refuses plan requests and checkouts while there is nothing to buy', async () => {
    const db = await marketplace();
    expect(await errorCode(requestPlan(db, { businessId: 'biz', userId: 'owner', planCode: 'BIZNES', months: 1 }, NOW))).toBe('TARIFFS_OFF');
    expect(await errorCode(createOrder(db, { businessId: 'biz', userId: 'owner', planCode: 'BIZNES', months: 1 }, NOW))).toBe('TARIFFS_OFF');
  });

  it('gives everyone a fresh free period when the tariffs open, and hides the deals only after it ends', async () => {
    const db = await marketplace();
    // A long free launch: the original trial has long ended by the time tariffs open.
    const opening = later(200);
    const opened = await setTariffsEnabled(db, { actorId: 'mod', on: true }, opening);
    expect(opened.trialsGranted).toBe(2);
    const subscription = await loadSubscription(db, 'biz', opening);
    expect(subscription).toMatchObject({ status: 'TRIAL', tariffs: true });
    expect(subscription.daysLeft).toBeGreaterThanOrEqual(89);
    // Opening twice does not extend again.
    expect((await setTariffsEnabled(db, { actorId: 'mod', on: true }, later(210))).trialsGranted).toBe(0);
    expect((await loadSubscription(db, 'biz', later(200 + 95))).status).toBe('EXPIRED');

    // Hiding the tariffs again brings everyone back on air for free.
    await setTariffsEnabled(db, { actorId: 'mod', on: false }, later(300));
    expect((await loadSubscription(db, 'biz', later(300))).status).toBe('FREE');
  });

  it('keeps a paid period as it is when the tariffs open', async () => {
    const db = await marketplace();
    await db.prepare(`UPDATE businesses SET paid_until = ?2, plan_code = 'START' WHERE id = ?1`).bind('biz', '2027-06-01 00:00:00').run();
    await setTariffsEnabled(db, { actorId: 'mod', on: true }, later(10));
    const row = await db.prepare(`SELECT paid_until AS paidUntil FROM businesses WHERE id = 'biz'`).first<{ paidUntil: string }>();
    expect(row?.paidUntil).toBe('2027-06-01 00:00:00');
    expect((await loadSubscription(db, 'biz', later(10))).status).toBe('ACTIVE');
  });
});
