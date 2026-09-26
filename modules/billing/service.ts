import { addMinutes, parseDbTime, toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';
import { staffAlertStatement } from '@/modules/notifications/service';
import { TRIAL_MONTH_OPTIONS, periodPrice as pricePeriod } from './pricing';

export type PlanCode = 'START' | 'BIZNES' | 'PREMIUM';

export type Plan = {
  code: PlanCode;
  nameUz: string;
  nameRu: string;
  priceMonthlyUzs: number;
  maxBranches: number | null;
  maxLiveDeals: number | null;
  maxStaff: number | null;
  topSlots: number;
  sortOrder: number;
  isActive: boolean;
};

export type BillingSettings = {
  trialMonths: number;
  trialPlan: PlanCode;
  paymentInstructionsUz: string;
  paymentInstructionsRu: string;
};

export { BILLING_PERIODS, TRIAL_MONTH_OPTIONS } from './pricing';

export function periodPrice(plan: Pick<Plan, 'priceMonthlyUzs'>, months: number) {
  const total = pricePeriod(plan.priceMonthlyUzs, months);
  if (total === null) throw new DomainError('VALIDATION');
  return total;
}

export async function listPlans(db: D1Database, options: { includeInactive?: boolean } = {}): Promise<Plan[]> {
  const rows = await db
    .prepare(`SELECT code, name_uz AS nameUz, name_ru AS nameRu, price_monthly_uzs AS priceMonthlyUzs, max_branches AS maxBranches,
        max_live_deals AS maxLiveDeals, max_staff AS maxStaff, top_slots AS topSlots, sort_order AS sortOrder, is_active AS isActive
      FROM plans WHERE (?1 = 1 OR is_active = 1) ORDER BY sort_order`)
    .bind(options.includeInactive ? 1 : 0)
    .all<Omit<Plan, 'isActive'> & { isActive: number }>();
  return rows.results.map((row) => ({ ...row, isActive: Boolean(row.isActive) }));
}

export async function getBillingSettings(db: D1Database): Promise<BillingSettings> {
  const rows = await db.prepare(`SELECT key, value FROM app_settings`).all<{ key: string; value: string }>();
  const map = new Map(rows.results.map((row) => [row.key, row.value]));
  const months = Number(map.get('trial_months'));
  const plan = map.get('trial_plan');
  return {
    trialMonths: TRIAL_MONTH_OPTIONS.includes(months as 1 | 2 | 3) ? months : 3,
    trialPlan: plan === 'START' || plan === 'BIZNES' || plan === 'PREMIUM' ? plan : 'BIZNES',
    paymentInstructionsUz: map.get('payment_instructions_uz') ?? '',
    paymentInstructionsRu: map.get('payment_instructions_ru') ?? '',
  };
}

export type SubscriptionStatus = 'NOT_STARTED' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';

export type Subscription = {
  status: SubscriptionStatus;
  plan: Plan | null;
  endsAt: string | null;
  daysLeft: number;
};

type BusinessBilling = { verificationStatus: string; planCode: string | null; trialEndsAt: string | null; paidUntil: string | null };

/**
 * NOT_STARTED — awaiting verification (drafts only, trial limits apply);
 * TRIAL — the free period runs with the trial plan's limits;
 * ACTIVE — a paid period runs; EXPIRED — deals are hidden until payment.
 */
export function subscriptionState(business: BusinessBilling, plans: Plan[], settings: BillingSettings, now = new Date()): Subscription {
  const nowDb = toDbTime(now);
  const find = (code: string | null) => plans.find((plan) => plan.code === code) ?? null;
  const daysLeft = (end: string) => Math.max(0, Math.ceil((parseDbTime(end).getTime() - now.getTime()) / 86_400_000));
  if (business.paidUntil && business.paidUntil > nowDb) {
    return { status: 'ACTIVE', plan: find(business.planCode) ?? find('START'), endsAt: business.paidUntil, daysLeft: daysLeft(business.paidUntil) };
  }
  if (business.trialEndsAt && business.trialEndsAt > nowDb) {
    return { status: 'TRIAL', plan: find(settings.trialPlan), endsAt: business.trialEndsAt, daysLeft: daysLeft(business.trialEndsAt) };
  }
  if (!business.trialEndsAt && !business.paidUntil && business.verificationStatus !== 'VERIFIED') {
    return { status: 'NOT_STARTED', plan: find(settings.trialPlan), endsAt: null, daysLeft: 0 };
  }
  return { status: 'EXPIRED', plan: null, endsAt: business.paidUntil ?? business.trialEndsAt, daysLeft: 0 };
}

export async function loadSubscription(db: D1Database, businessId: string, now = new Date()) {
  const [business, plans, settings] = await Promise.all([
    db.prepare(`SELECT verification_status AS verificationStatus, plan_code AS planCode, trial_ends_at AS trialEndsAt, paid_until AS paidUntil
        FROM businesses WHERE id = ?1`).bind(businessId).first<BusinessBilling>(),
    listPlans(db, { includeInactive: true }),
    getBillingSettings(db),
  ]);
  if (!business) throw new DomainError('NOT_FOUND');
  return subscriptionState(business, plans, settings, now);
}

export type LimitKind = 'branches' | 'liveDeals' | 'staff' | 'topSlots';

/** Throws PLAN_LIMIT when adding one more item would exceed the current plan. */
export async function assertWithinLimit(db: D1Database, businessId: string, kind: LimitKind, now = new Date()) {
  const subscription = await loadSubscription(db, businessId, now);
  if (subscription.status === 'EXPIRED' || !subscription.plan) throw new DomainError('SUBSCRIPTION_EXPIRED');
  const nowDb = toDbTime(now);
  const plan = subscription.plan;
  const limit = { branches: plan.maxBranches, liveDeals: plan.maxLiveDeals, staff: plan.maxStaff, topSlots: plan.topSlots }[kind];
  if (limit === null) return;
  const queries: Record<LimitKind, D1PreparedStatement> = {
    branches: db.prepare(`SELECT COUNT(*) AS n FROM branches WHERE business_id = ?1 AND deleted_at IS NULL`).bind(businessId),
    liveDeals: db.prepare(`SELECT COUNT(*) AS n FROM deals WHERE business_id = ?1 AND deleted_at IS NULL
      AND (status = 'PENDING_REVIEW' OR (status = 'ACTIVE' AND ends_at > ?2))`).bind(businessId, nowDb),
    staff: db.prepare(`SELECT COUNT(*) AS n FROM business_members WHERE business_id = ?1 AND revoked_at IS NULL`).bind(businessId),
    topSlots: db.prepare(`SELECT COUNT(*) AS n FROM deals WHERE business_id = ?1 AND deleted_at IS NULL AND is_sponsored = 1
      AND status IN ('ACTIVE', 'PAUSED', 'PENDING_REVIEW') AND ends_at > ?2`).bind(businessId, nowDb),
  };
  const used = (await queries[kind].first<{ n: number }>())?.n ?? 0;
  if (used >= limit) throw new DomainError('PLAN_LIMIT', 409, { limit });
}

const maxDb = (a: string | null, b: string) => (a && a > b ? a : b);
const monthsLater = (fromDb: string, months: number) => {
  const from = parseDbTime(fromDb);
  const target = new Date(from.getTime());
  target.setUTCMonth(target.getUTCMonth() + months);
  return toDbTime(target);
};

export async function requestPlan(db: D1Database, input: { businessId: string; userId: string; planCode: string; months: number }, now = new Date()) {
  const plans = await listPlans(db);
  const plan = plans.find((item) => item.code === input.planCode);
  if (!plan) throw new DomainError('VALIDATION');
  const amount = periodPrice(plan, input.months);
  const nowDb = toDbTime(now);
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare(`UPDATE billing_requests SET status = 'CANCELED', handled_at = ?2, note = 'Replaced by a newer request'
      WHERE business_id = ?1 AND status = 'PENDING'
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.billing_request_id = billing_requests.id AND p.state = 1)`).bind(input.businessId, nowDb),
    db.prepare(`INSERT INTO billing_requests(id, business_id, plan_code, months, amount_uzs, status, requested_by, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, 'PENDING', ?6, ?7)`).bind(id, input.businessId, plan.code, input.months, amount, input.userId, nowDb),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'billing.requested', targetType: 'BillingRequest', targetId: id, after: { plan: plan.code, months: input.months, amount } }, nowDb),
    // The admins hear about it in Telegram instead of watching the panel.
    staffAlertStatement(db, { kind: 'PAYMENT_REQUEST', key: id, payload: { requestId: id }, nowDb }),
  ]);
  return { id, amount };
}

/** Admin confirms that the money arrived; the paid period starts or extends. */
export async function confirmBillingRequest(db: D1Database, input: { requestId: string; adminId: string; note?: string | null }, now = new Date()) {
  const request = await db
    .prepare(`SELECT r.id, r.business_id AS businessId, r.plan_code AS planCode, r.months, r.status, b.paid_until AS paidUntil
      FROM billing_requests r JOIN businesses b ON b.id = r.business_id WHERE r.id = ?1`)
    .bind(input.requestId)
    .first<{ id: string; businessId: string; planCode: string; months: number; status: string; paidUntil: string | null }>();
  if (!request) throw new DomainError('NOT_FOUND');
  if (request.status !== 'PENDING') throw new DomainError('INVALID_TRANSITION');
  const nowDb = toDbTime(now);
  const paidUntil = monthsLater(maxDb(request.paidUntil, nowDb), request.months);
  const results = await db.batch([
    db.prepare(`UPDATE billing_requests SET status = 'PAID', handled_by = ?2, handled_at = ?3, note = ?4 WHERE id = ?1 AND status = 'PENDING'`)
      .bind(request.id, input.adminId, nowDb, input.note ?? null),
    db.prepare(`UPDATE businesses SET plan_code = ?2, paid_until = ?3, updated_at = ?4
      WHERE id = ?1 AND EXISTS (SELECT 1 FROM billing_requests WHERE id = ?5 AND status = 'PAID' AND handled_at = ?4)`)
      .bind(request.businessId, request.planCode, paidUntil, nowDb, request.id),
    auditStatement(db, { actorUserId: input.adminId, businessId: request.businessId, action: 'billing.paid', targetType: 'BillingRequest', targetId: request.id, before: { paidUntil: request.paidUntil }, after: { plan: request.planCode, paidUntil } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  return { paidUntil };
}

export async function cancelBillingRequest(db: D1Database, input: { requestId: string; adminId: string; note?: string | null }, now = new Date()) {
  const nowDb = toDbTime(now);
  const result = await db
    .prepare(`UPDATE billing_requests SET status = 'CANCELED', handled_by = ?2, handled_at = ?3, note = ?4 WHERE id = ?1 AND status = 'PENDING'
      AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.billing_request_id = billing_requests.id AND p.state = 1)`)
    .bind(input.requestId, input.adminId, nowDb, input.note ?? null)
    .run();
  if ((result.meta.changes ?? 0) !== 1) throw new DomainError('INVALID_TRANSITION');
}

/** Admin grants (or extends) the free period by 1–3 months. */
export async function grantTrial(db: D1Database, input: { businessId: string; adminId: string; months: number }, now = new Date()) {
  const business = await db.prepare(`SELECT trial_ends_at AS trialEndsAt FROM businesses WHERE id = ?1`).bind(input.businessId).first<{ trialEndsAt: string | null }>();
  if (!business) throw new DomainError('NOT_FOUND');
  const nowDb = toDbTime(now);
  const trialEndsAt = monthsLater(maxDb(business.trialEndsAt, nowDb), input.months);
  await db.batch([
    db.prepare(`UPDATE businesses SET trial_ends_at = ?2, updated_at = ?3 WHERE id = ?1`).bind(input.businessId, trialEndsAt, nowDb),
    auditStatement(db, { actorUserId: input.adminId, businessId: input.businessId, action: 'billing.trial_granted', targetType: 'Business', targetId: input.businessId, before: { trialEndsAt: business.trialEndsAt }, after: { trialEndsAt, months: input.months } }, nowDb),
  ]);
  return { trialEndsAt };
}

/** Admin activates a plan directly (for example, a payment received outside a request). */
export async function grantPlan(db: D1Database, input: { businessId: string; adminId: string; planCode: string; months: number }, now = new Date()) {
  const [business, plans] = await Promise.all([
    db.prepare(`SELECT paid_until AS paidUntil FROM businesses WHERE id = ?1`).bind(input.businessId).first<{ paidUntil: string | null }>(),
    listPlans(db, { includeInactive: true }),
  ]);
  if (!business) throw new DomainError('NOT_FOUND');
  if (!plans.some((plan) => plan.code === input.planCode)) throw new DomainError('VALIDATION');
  const nowDb = toDbTime(now);
  const paidUntil = monthsLater(maxDb(business.paidUntil, nowDb), input.months);
  await db.batch([
    db.prepare(`UPDATE businesses SET plan_code = ?2, paid_until = ?3, updated_at = ?4 WHERE id = ?1`).bind(input.businessId, input.planCode, paidUntil, nowDb),
    auditStatement(db, { actorUserId: input.adminId, businessId: input.businessId, action: 'billing.plan_granted', targetType: 'Business', targetId: input.businessId, before: { paidUntil: business.paidUntil }, after: { plan: input.planCode, paidUntil } }, nowDb),
  ]);
  return { paidUntil };
}

/** Starts the free period when a business is first verified. */
export function trialStartStatement(db: D1Database, businessId: string, trialMonths: number, now: Date) {
  const trialEndsAt = monthsLater(toDbTime(now), trialMonths);
  return db.prepare(`UPDATE businesses SET trial_ends_at = ?2 WHERE id = ?1 AND trial_ends_at IS NULL`).bind(businessId, trialEndsAt);
}

export function daysFrom(now: Date, days: number) {
  return toDbTime(addMinutes(now, days * 24 * 60));
}
