import type { AppConfig } from '@/lib/env';
import { toDbTime } from '@/lib/time';
import { auditStatement, auditStatementIf } from '@/modules/audit';
import { listPlans, periodPrice } from '@/modules/billing/service';
import { DomainError } from '@/modules/errors';
import { teamStatement } from '@/modules/notifications/service';

// Businesses pay for plans online through Payme or Click. A payment belongs to
// a billing request (the "order"). Only the provider's server-to-server call
// (Payme PerformTransaction, Click Complete) marks an order PAID, in the same
// transaction that starts the paid period: the browser can never do it.
// Customers still pay businesses on site; BugunBor never takes their money.

export type Provider = 'PAYME' | 'CLICK';
type Payments = AppConfig['payments'];

/** Payme transaction states; Click payments use the same numbers. */
export const STATE = { CREATED: 1, PERFORMED: 2, CANCELED: -1, CANCELED_AFTER_PERFORM: -2 } as const;

/** Payme cancels a transaction that was not performed within 12 hours. */
export const PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000;

/** Businesses can start a checkout: payments are switched on and the provider is configured. */
export function checkoutAvailable(payments: Payments, provider: Provider) {
  return payments.enabled && Boolean(provider === 'PAYME' ? payments.payme : payments.click);
}

/** The provider's callback answers: while live, or during its sandbox tests. */
export function callbackOpen(payments: Payments, provider: Provider) {
  const settings = provider === 'PAYME' ? payments.payme : payments.click;
  return Boolean(settings && (payments.enabled || settings.sandbox));
}

export type PaymentRow = {
  id: string;
  rowid: number;
  billingRequestId: string;
  provider: Provider;
  providerTransactionId: string;
  amountUzs: number;
  state: number;
  reason: number | null;
  providerTime: number | null;
  createTime: number;
  performTime: number | null;
  cancelTime: number | null;
};

export type OrderRow = { id: string; businessId: string; planCode: string; months: number; amountUzs: number; status: string };

const PAYMENT_COLUMNS = `id, rowid, billing_request_id AS billingRequestId, provider, provider_transaction_id AS providerTransactionId,
  amount_uzs AS amountUzs, state, reason, provider_time AS providerTime, create_time AS createTime,
  perform_time AS performTime, cancel_time AS cancelTime`;

export function findOrder(db: D1Database, id: string) {
  return db
    .prepare(`SELECT id, business_id AS businessId, plan_code AS planCode, months, amount_uzs AS amountUzs, status FROM billing_requests WHERE id = ?1`)
    .bind(id)
    .first<OrderRow>();
}

export function findPayment(db: D1Database, provider: Provider, providerTransactionId: string) {
  return db
    .prepare(`SELECT ${PAYMENT_COLUMNS} FROM payments WHERE provider = ?1 AND provider_transaction_id = ?2`)
    .bind(provider, providerTransactionId)
    .first<PaymentRow>();
}

/** Another payment for the order is still in progress (Payme allows one per account). */
export async function hasOpenPayment(db: D1Database, orderId: string, exceptId = '') {
  const row = await db
    .prepare(`SELECT 1 AS open FROM payments WHERE billing_request_id = ?1 AND state = 1 AND id <> ?2 LIMIT 1`)
    .bind(orderId, exceptId)
    .first<{ open: number }>();
  return Boolean(row);
}

/** Records a new created payment; a duplicate provider id returns the existing row. */
export async function insertPayment(
  db: D1Database,
  input: { order: OrderRow; provider: Provider; providerTransactionId: string; providerTime?: number | null; meta?: Record<string, string>; now: Date },
) {
  await db
    .prepare(`INSERT OR IGNORE INTO payments(id, billing_request_id, provider, provider_transaction_id, amount_uzs, state, provider_time, create_time, meta_json, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?9, ?9)`)
    .bind(crypto.randomUUID(), input.order.id, input.provider, input.providerTransactionId, input.order.amountUzs, input.providerTime ?? null, input.now.getTime(), input.meta ? JSON.stringify(input.meta) : null, toDbTime(input.now))
    .run();
  return (await findPayment(db, input.provider, input.providerTransactionId))!;
}

/** Cancels a created payment (the order stays open for another try). Stamps the time once. */
export async function cancelCreatedPayment(db: D1Database, payment: PaymentRow, reason: number | null, now: Date) {
  await db
    .prepare(`UPDATE payments SET state = -1, reason = ?2, cancel_time = ?3, updated_at = ?4 WHERE id = ?1 AND state = 1`)
    .bind(payment.id, reason, now.getTime(), toDbTime(now))
    .run();
  return (await findPayment(db, payment.provider, payment.providerTransactionId))!;
}

/**
 * Performs a created payment and switches the paid plan on, atomically. Each
 * step only applies if the previous one did: the payment moves 1 → 2, the order
 * PENDING → PAID, and only then the paid period starts or extends.
 */
export async function performPayment(db: D1Database, payment: PaymentRow, order: OrderRow, now: Date) {
  const nowDb = toDbTime(now);
  const note = `${payment.provider} ${payment.providerTransactionId}`;
  const paid = `EXISTS (SELECT 1 FROM billing_requests WHERE id = ?1 AND status = 'PAID' AND handled_at = ?2 AND note = ?3)`;
  const results = await db.batch([
    db.prepare(`UPDATE payments SET state = 2, perform_time = ?2, updated_at = ?3
      WHERE id = ?1 AND state = 1 AND EXISTS (SELECT 1 FROM billing_requests WHERE id = ?4 AND status = 'PENDING')`)
      .bind(payment.id, now.getTime(), nowDb, order.id),
    db.prepare(`UPDATE billing_requests SET status = 'PAID', handled_at = ?2, note = ?3
      WHERE id = ?1 AND status = 'PENDING' AND EXISTS (SELECT 1 FROM payments WHERE id = ?4 AND state = 2 AND perform_time = ?5)`)
      .bind(order.id, nowDb, note, payment.id, now.getTime()),
    db.prepare(`UPDATE businesses SET plan_code = ?4,
        paid_until = strftime('%Y-%m-%d %H:%M:%S', CASE WHEN paid_until > ?2 THEN paid_until ELSE ?2 END, '+' || ?5 || ' months'),
        updated_at = ?2
      WHERE id = ?6 AND ${paid}`)
      .bind(order.id, nowDb, note, order.planCode, order.months, order.businessId),
    auditStatementIf(db, { actorUserId: null, businessId: order.businessId, action: 'billing.paid_online', targetType: 'BillingRequest', targetId: order.id, after: { provider: payment.provider, transaction: payment.providerTransactionId, plan: order.planCode, months: order.months, amount: order.amountUzs } }, nowDb,
      `EXISTS (SELECT 1 FROM billing_requests WHERE id = ?11 AND status = 'PAID' AND handled_at = ?12 AND note = ?13)`, order.id, nowDb, note),
  ]);
  // The first step only applies to a created payment of an open order; the rest follow it.
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  await teamStatement(db, { businessId: order.businessId, kind: 'PAYMENT_RECEIVED', key: order.id, payload: { requestId: order.id }, nowDb }).run()
    .catch((error: unknown) => console.error('Payment notification failed', error instanceof Error ? error.message : 'unknown'));
  return (await findPayment(db, payment.provider, payment.providerTransactionId))!;
}

/**
 * A performed payment was refunded (Payme cancels it after the fact): the
 * order becomes REFUNDED and the paid period it added is taken back.
 */
export async function refundPayment(db: D1Database, payment: PaymentRow, order: OrderRow, reason: number | null, now: Date) {
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`UPDATE payments SET state = -2, reason = ?2, cancel_time = ?3, updated_at = ?4 WHERE id = ?1 AND state = 2`).bind(payment.id, reason, now.getTime(), nowDb),
    db.prepare(`UPDATE billing_requests SET status = 'REFUNDED', handled_at = ?2
      WHERE id = ?1 AND status = 'PAID' AND EXISTS (SELECT 1 FROM payments WHERE id = ?3 AND state = -2 AND cancel_time = ?4)`)
      .bind(order.id, nowDb, payment.id, now.getTime()),
    db.prepare(`UPDATE businesses SET paid_until = strftime('%Y-%m-%d %H:%M:%S', paid_until, '-' || ?3 || ' months'), updated_at = ?2
      WHERE id = ?4 AND paid_until IS NOT NULL
        AND EXISTS (SELECT 1 FROM billing_requests WHERE id = ?1 AND status = 'REFUNDED' AND handled_at = ?2)`)
      .bind(order.id, nowDb, order.months, order.businessId),
    auditStatement(db, { actorUserId: null, businessId: order.businessId, action: 'billing.refunded', targetType: 'BillingRequest', targetId: order.id, after: { provider: payment.provider, transaction: payment.providerTransactionId, reason } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  return (await findPayment(db, payment.provider, payment.providerTransactionId))!;
}

/**
 * The order behind an online checkout. Reuses an open order for the same plan
 * and period (a second click does not start a second order); other open orders
 * are replaced unless a payment for them is already in progress.
 */
export async function createOrder(db: D1Database, input: { businessId: string; userId: string; planCode: string; months: number }, now = new Date()) {
  const plan = (await listPlans(db)).find((item) => item.code === input.planCode);
  if (!plan) throw new DomainError('VALIDATION');
  const amount = periodPrice(plan, input.months);
  const same = await db
    .prepare(`SELECT id FROM billing_requests WHERE business_id = ?1 AND status = 'PENDING' AND plan_code = ?2 AND months = ?3 AND amount_uzs = ?4
      ORDER BY created_at DESC LIMIT 1`)
    .bind(input.businessId, plan.code, input.months, amount)
    .first<{ id: string }>();
  if (same) return { id: same.id, amount };
  const id = crypto.randomUUID();
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE billing_requests SET status = 'CANCELED', handled_at = ?2, note = 'Replaced by a newer request'
      WHERE business_id = ?1 AND status = 'PENDING'
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.billing_request_id = billing_requests.id AND p.state = 1)`).bind(input.businessId, nowDb),
    db.prepare(`INSERT INTO billing_requests(id, business_id, plan_code, months, amount_uzs, status, requested_by, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, 'PENDING', ?6, ?7)`).bind(id, input.businessId, plan.code, input.months, amount, input.userId, nowDb),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'billing.requested', targetType: 'BillingRequest', targetId: id, after: { plan: plan.code, months: input.months, amount, online: true } }, nowDb),
  ]);
  return { id, amount };
}

const base64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

/** Payme checkout: base64 of "m=…;ac.order_id=…;a=<tiyin>;c=<return url>;l=<lang>"; the sandbox uses test.paycom.uz. */
export function paymeCheckoutUrl(payme: { merchantId: string; sandbox: boolean }, order: { id: string; amountUzs: number }, returnUrl: string, locale: 'uz' | 'ru') {
  const params = `m=${payme.merchantId};ac.order_id=${order.id};a=${order.amountUzs * 100};c=${returnUrl};l=${locale}`;
  return `${payme.sandbox ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz'}/${base64(params)}`;
}

export function clickCheckoutUrl(click: { serviceId: string; merchantId: string }, order: { id: string; amountUzs: number }, returnUrl: string) {
  const query = new URLSearchParams({
    service_id: click.serviceId,
    merchant_id: click.merchantId,
    amount: String(order.amountUzs),
    transaction_param: order.id,
    return_url: returnUrl,
  });
  return `https://my.click.uz/services/pay?${query}`;
}
