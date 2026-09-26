import { beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { dateToTashkentInput, toDbTime } from '@/lib/time';
import { cancelBillingRequest, confirmBillingRequest, grantPlan, grantTrial, loadSubscription, requestPlan } from '@/modules/billing/service';
import { listLiveDeals } from '@/modules/catalog/queries';
import { dealInputSchema, type DealInput } from '@/modules/deals/schema';
import { createDeal, duplicateDeal, setDealTop, transitionDeal, updateDeal } from '@/modules/deals/service';
import { decideBusiness, decideDeal, setBusinessSuspended } from '@/modules/moderation/service';
import { claimDeal, completeRedemption, lookupRedemption } from '@/modules/redemptions/service';
import { createTestD1 } from '@/test/d1';
import { addMember, createBranch, createBusiness, deleteBranch, listBranches, removeMember } from './service';

const NOW = new Date('2026-09-25T06:00:00Z'); // 11:00 in Tashkent
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string; message?: string }) => error.code ?? error.message ?? 'UNKNOWN');

function dealInput(branchIds: string[], overrides: Partial<Record<keyof DealInput, unknown>> = {}): DealInput {
  return dealInputSchema.parse({
    title: 'Osh va salat kombo',
    description: 'Bir porsiya osh, salat va issiq non — tushlik uchun.',
    terms: 'Faqat restoranda.',
    categoryId: 'cat_food',
    visual: 'plov',
    originalPrice: 60000,
    price: 40000,
    startsAt: dateToTashkentInput(NOW),
    endsAt: dateToTashkentInput(later(240)),
    quantity: 20,
    perCustomerLimit: 1,
    claimTtlMinutes: 60,
    branchIds,
    ...overrides,
  });
}

describe('business workflow', () => {
  let db: D1Database;
  beforeEach(async () => {
    db = createTestD1();
    await applyMigrations(db);
    // These tests cover the paid model; the free launch has its own tests.
    await db.prepare(`UPDATE app_settings SET value = '1' WHERE key = 'tariffs_enabled'`).run();
    await db.prepare(`INSERT INTO users(id, role, display_name, phone, locale) VALUES
      ('owner', 'CUSTOMER', 'Owner', '+998900000001', 'uz'),
      ('cashier', 'CUSTOMER', 'Kassir', '+998900000002', 'uz'),
      ('alice', 'CUSTOMER', 'Alice', '+998901234567', 'uz'),
      ('mod', 'MODERATOR', 'Moderator', '+998900000009', 'uz'),
      ('admin', 'ADMIN', 'Admin', '+998900000010', 'uz')`).run();
  });

  async function onboard() {
    const business = await createBusiness(db, {
      userId: 'owner',
      locale: 'uz',
      data: { name: 'Mening Kafem', description: 'Shinam kafe, milliy va yevropa taomlari.', categoryId: 'cat_food', city: 'tashkent', phone: '+998901112233', address: 'Amir Temur 1', telegram: null, instagram: null, website: null, latitude: null, longitude: null },
    }, NOW);
    const [branch] = await listBranches(db, business.id, NOW);
    return { businessId: business.id, branchId: branch.id };
  }

  it('runs from onboarding to a redeemed code', async () => {
    const { businessId, branchId } = await onboard();
    expect((await loadSubscription(db, businessId, NOW)).status).toBe('NOT_STARTED');

    const { id: dealId } = await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId]), submit: true }, NOW);
    expect(await errorCode(decideDeal(db, { actorId: 'mod', dealId, decision: 'APPROVE', reason: '' }, NOW))).toBe('BUSINESS_NOT_VERIFIED');
    expect(await errorCode(decideBusiness(db, { actorId: 'mod', businessId, decision: 'REJECT', reason: 'short' }, NOW))).toBe('VALIDATION');

    await decideBusiness(db, { actorId: 'mod', businessId, decision: 'APPROVE', reason: '' }, NOW);
    const trial = await loadSubscription(db, businessId, NOW);
    expect(trial).toMatchObject({ status: 'TRIAL', endsAt: '2026-12-25 06:00:00', plan: { code: 'BIZNES' } });

    await decideDeal(db, { actorId: 'mod', dealId, decision: 'APPROVE', reason: '' }, NOW);
    const live = await listLiveDeals(db, { demo: false, now: later(1) });
    expect(live.map((deal) => deal.id)).toEqual([dealId]);

    await addMember(db, { businessId, userId: 'owner', phone: '+998900000002', role: 'CASHIER' }, NOW);
    const claim = await claimDeal(db, { dealId, branchId, userId: 'alice', idempotencyKey: 'alice-key-000001', secret: 's', now: later(2) });
    const found = await lookupRedemption(db, { businessId, code: claim.code, secret: 's', now: later(3) });
    await completeRedemption(db, { businessId, redemptionId: found.id, staffUserId: 'cashier', now: later(3) });
    const status = await db.prepare(`SELECT status FROM redemptions WHERE id = ?1`).bind(claim.id).first<string>('status');
    expect(status).toBe('COMPLETED');
  });

  it('hides deals when the free period ends and restores them after payment', async () => {
    const { businessId, branchId } = await onboard();
    await decideBusiness(db, { actorId: 'mod', businessId, decision: 'APPROVE', reason: '' }, NOW);
    const afterTrial = new Date('2026-12-26T06:00:00Z');
    const window = { startsAt: dateToTashkentInput(afterTrial), endsAt: dateToTashkentInput(new Date(afterTrial.getTime() + 4 * 3600_000)) };
    const { id: dealId } = await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId], window), submit: true }, NOW);
    await decideDeal(db, { actorId: 'mod', dealId, decision: 'APPROVE', reason: '' }, NOW);

    const soon = new Date(afterTrial.getTime() + 60_000);
    expect((await loadSubscription(db, businessId, soon)).status).toBe('EXPIRED');
    expect(await listLiveDeals(db, { demo: false, now: soon })).toHaveLength(0);
    expect(await errorCode(claimDeal(db, { dealId, branchId, userId: 'alice', idempotencyKey: 'alice-key-000002', secret: 's', now: soon }))).toBe('BUSINESS_UNAVAILABLE');
    expect(await errorCode(createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId], window), submit: true }, soon))).toBe('SUBSCRIPTION_EXPIRED');

    const request = await requestPlan(db, { businessId, userId: 'owner', planCode: 'START', months: 3 }, soon);
    expect(request.amount).toBe(425_000);
    await confirmBillingRequest(db, { requestId: request.id, adminId: 'admin' }, soon);
    expect(await loadSubscription(db, businessId, soon)).toMatchObject({ status: 'ACTIVE', plan: { code: 'START' } });
    expect((await listLiveDeals(db, { demo: false, now: soon })).map((deal) => deal.id)).toEqual([dealId]);
    expect(await errorCode(confirmBillingRequest(db, { requestId: request.id, adminId: 'admin' }, soon))).toBe('INVALID_TRANSITION');
  });

  it('enforces plan limits for deals, branches, staff and TOP slots', async () => {
    const { businessId, branchId } = await onboard();
    await decideBusiness(db, { actorId: 'mod', businessId, decision: 'APPROVE', reason: '' }, NOW);
    await grantPlan(db, { businessId, adminId: 'admin', planCode: 'START', months: 1 }, NOW);

    for (let index = 0; index < 3; index += 1) {
      await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId]), submit: true }, NOW);
    }
    expect(await errorCode(createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId]), submit: true }, NOW))).toBe('PLAN_LIMIT');
    const draft = await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId]), submit: false }, NOW);
    expect(draft.status).toBe('DRAFT');

    expect(await errorCode(createBranch(db, { businessId, userId: 'owner', data: { name: 'Ikkinchi', city: 'tashkent', address: 'Chilonzor 5', phone: null, open: '09:00', close: '22:00' } }, NOW))).toBe('PLAN_LIMIT');
    await addMember(db, { businessId, userId: 'owner', phone: '+998900000002', role: 'CASHIER' }, NOW);
    expect(await errorCode(addMember(db, { businessId, userId: 'owner', phone: '+998901234567', role: 'CASHIER' }, NOW))).toBe('PLAN_LIMIT');
    expect(await errorCode(setDealTop(db, { businessId, userId: 'owner', dealId: draft.id, on: true }, NOW))).toBe('INVALID_TRANSITION');

    await grantTrial(db, { businessId, adminId: 'admin', months: 1 }, NOW);
    await grantPlan(db, { businessId, adminId: 'admin', planCode: 'PREMIUM', months: 1 }, NOW);
    await createBranch(db, { businessId, userId: 'owner', data: { name: 'Ikkinchi', city: 'tashkent', address: 'Chilonzor 5', phone: null, open: '09:00', close: '22:00' } }, NOW);
    expect(await listBranches(db, businessId, NOW)).toHaveLength(2);
  });

  it('applies deal lifecycle rules', async () => {
    const { businessId, branchId } = await onboard();
    await decideBusiness(db, { actorId: 'mod', businessId, decision: 'APPROVE', reason: '' }, NOW);
    const { id: dealId } = await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId]), submit: false }, NOW);
    await updateDeal(db, { businessId, userId: 'owner', dealId, input: dealInput([branchId], { title: 'Yangilangan kombo' }), submit: true }, NOW);
    expect(await errorCode(updateDeal(db, { businessId, userId: 'owner', dealId, input: dealInput([branchId]), submit: false }, NOW))).toBe('INVALID_TRANSITION');
    await transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'withdraw' }, NOW);
    await transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'submit' }, NOW);
    await decideDeal(db, { actorId: 'mod', dealId, decision: 'REJECT', reason: 'Narx noto‘g‘ri ko‘rsatilgan' }, NOW);
    const rejected = await db.prepare(`SELECT status, rejection_reason AS reason FROM deals WHERE id = ?1`).bind(dealId).first();
    expect(rejected).toEqual({ status: 'REJECTED', reason: 'Narx noto‘g‘ri ko‘rsatilgan' });
    await transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'submit' }, NOW);
    await decideDeal(db, { actorId: 'mod', dealId, decision: 'APPROVE', reason: '' }, NOW);
    await setDealTop(db, { businessId, userId: 'owner', dealId, on: true }, NOW);
    await transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'pause' }, NOW);
    await transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'resume' }, NOW);
    await transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'end' }, NOW);
    expect(await errorCode(transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'resume' }, NOW))).toBe('INVALID_TRANSITION');
    const copy = await duplicateDeal(db, { businessId, userId: 'owner', dealId }, NOW);
    const copied = await db.prepare(`SELECT status, title, remaining_quantity AS remaining FROM deals WHERE id = ?1`).bind(copy.id).first();
    expect(copied).toEqual({ status: 'DRAFT', title: 'Yangilangan kombo', remaining: 20 });
    await transitionDeal(db, { businessId, userId: 'owner', dealId: copy.id, action: 'delete' }, NOW);
  });

  it('protects branches, team and suspended businesses', async () => {
    const { businessId, branchId } = await onboard();
    await decideBusiness(db, { actorId: 'mod', businessId, decision: 'APPROVE', reason: '' }, NOW);
    expect(await errorCode(deleteBranch(db, { businessId, userId: 'owner', branchId }, NOW))).toBe('LAST_BRANCH');
    const second = await createBranch(db, { businessId, userId: 'owner', data: { name: 'Ikkinchi', city: 'tashkent', address: 'Chilonzor 5', phone: null, open: '09:00', close: '22:00' } }, NOW);
    const { id: dealId } = await createDeal(db, { businessId, userId: 'owner', input: dealInput([second.id]), submit: true }, NOW);
    expect(await errorCode(deleteBranch(db, { businessId, userId: 'owner', branchId: second.id }, NOW))).toBe('BRANCH_IN_USE');
    await transitionDeal(db, { businessId, userId: 'owner', dealId, action: 'withdraw' }, NOW);
    await deleteBranch(db, { businessId, userId: 'owner', branchId: second.id }, NOW);

    expect(await errorCode(addMember(db, { businessId, userId: 'owner', phone: '+998909999999', role: 'CASHIER' }, NOW))).toBe('USER_NOT_FOUND');
    await addMember(db, { businessId, userId: 'owner', phone: '+998900000002', role: 'CASHIER' }, NOW);
    expect(await errorCode(addMember(db, { businessId, userId: 'owner', phone: '+998900000002', role: 'MANAGER' }, NOW))).toBe('ALREADY_MEMBER');
    expect(await errorCode(removeMember(db, { businessId, userId: 'owner', memberId: 'owner' }, NOW))).toBe('SELF_ACTION');
    await removeMember(db, { businessId, userId: 'owner', memberId: 'cashier' }, NOW);

    await setBusinessSuspended(db, { actorId: 'admin', businessId, suspended: true, reason: 'Shikoyatlar tekshirilmoqda' }, NOW);
    const suspended = await db.prepare(`SELECT suspended_at AS at FROM businesses WHERE id = ?1`).bind(businessId).first<string>('at');
    expect(suspended).toBe(toDbTime(NOW));
  });

  it('keeps billing requests one at a time', async () => {
    const { businessId } = await onboard();
    const first = await requestPlan(db, { businessId, userId: 'owner', planCode: 'BIZNES', months: 1 }, NOW);
    const second = await requestPlan(db, { businessId, userId: 'owner', planCode: 'PREMIUM', months: 12 }, NOW);
    expect(second.amount).toBe(6_110_000); // 599 000 × 12 − 15%, rounded to 1 000
    const statuses = await db.prepare(`SELECT id, status FROM billing_requests ORDER BY created_at, status`).all<{ id: string; status: string }>();
    expect(statuses.results.find((row) => row.id === first.id)?.status).toBe('CANCELED');
    await cancelBillingRequest(db, { requestId: second.id, adminId: 'admin' }, NOW);
  });
});

describe('deal input validation', () => {
  const base = { title: 'Osh kombo', description: 'Yigirma belgidan uzun tavsif matni.', terms: 'Shartlar', categoryId: 'cat_food', visual: 'plov', originalPrice: 60000, quantity: 10, perCustomerLimit: 1, claimTtlMinutes: 60, branchIds: ['b'] };
  const window = { startsAt: '2026-09-25T12:00', endsAt: '2026-09-25T16:00' };
  const issues = (value: Record<string, unknown>) => {
    const result = dealInputSchema.safeParse(value);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };
  it('requires at least a 10% discount below the original price', () => {
    expect(issues({ ...base, ...window, price: 57000 })).toEqual(['minDiscount']);
    expect(issues({ ...base, ...window, price: 60000 })).toEqual(['priceOrder']);
    expect(issues({ ...base, ...window, price: 54000 })).toEqual([]);
  });
  it('checks the time window', () => {
    expect(issues({ ...base, price: 40000, startsAt: '2026-09-25T12:00', endsAt: '2026-09-25T11:00' })).toEqual(['endAfterStart']);
    expect(issues({ ...base, price: 40000, startsAt: '2026-09-25T12:00', endsAt: '2026-09-25T12:10' })).toEqual(['duration']);
    expect(issues({ ...base, price: 40000, startsAt: '2026-09-25T12:00', endsAt: '2026-10-30T12:00' })).toEqual(['duration']);
    expect(issues({ ...base, price: 40000, startsAt: 'yesterday', endsAt: '2026-09-25T12:00' })).toContain('invalid');
  });
});
