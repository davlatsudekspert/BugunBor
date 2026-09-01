import { env } from 'cloudflare:workers';

import { timingSafeEqual } from '@/lib/crypto';

const DEFAULT_CHECKOUT_BASE_URL = 'https://checkout.paycom.uz';

/**
 * Payme Merchant API JSON-RPC error codes — see help.paycom.uz's Merchant API reference.
 * ORDER_NOT_FOUND/ORDER_ALREADY_HAS_TRANSACTION are merchant-defined within Payme's reserved
 * -31099..-31050 range (every public Payme integration guide uses -31050 for "order not found").
 */
export const PaymeErrorCode = {
  PARSE_ERROR: -32700,
  METHOD_NOT_FOUND: -32601,
  INSUFFICIENT_PRIVILEGE: -32504,
  INVALID_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  CANNOT_PERFORM_OR_CANCEL: -31008,
  ORDER_NOT_FOUND: -31050,
  ORDER_ALREADY_PROCESSED: -31051,
} as const;

class PaymeRpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * True only once real merchant credentials are configured. Everything below fails closed
 * without them — mirrors modules/providers/development.ts's developmentPaymentProvider,
 * which throws rather than ever simulating a successful payment. There is nothing to "turn
 * on" beyond setting PAYME_MERCHANT_ID and PAYME_SECRET_KEY as Worker secrets (see
 * .github/workflows/deploy-cloudflare.yml): the checkout link and the webhook state machine
 * below are already the real Payme Merchant API, not a placeholder.
 */
export function isPaymeConfigured() {
  return Boolean(env.PAYME_MERCHANT_ID && env.PAYME_SECRET_KEY);
}

/**
 * Payme's classic checkout redirect: base64("m=<merchant>;ac.order_id=<id>;a=<tiyin>") appended
 * to https://checkout.paycom.uz/. `amountUzs` is BugunBor's own so'm price — Payme's API is
 * always tiyin (1 so'm = 100 tiyin).
 */
export function buildPaymeCheckoutUrl(orderId: string, amountUzs: number) {
  if (!env.PAYME_MERCHANT_ID) throw new Error('PAYME_NOT_CONFIGURED');
  const amountTiyin = Math.round(amountUzs * 100);
  const params = `m=${env.PAYME_MERCHANT_ID};ac.order_id=${orderId};a=${amountTiyin}`;
  const base = env.PAYME_CHECKOUT_URL || DEFAULT_CHECKOUT_BASE_URL;
  return `${base}/${btoa(params)}`;
}

/**
 * Payme authenticates every merchant JSON-RPC call with HTTP Basic auth: login is the fixed
 * string "Paycom", password is the merchant secret key. Nothing else protects
 * POST /api/v1/payments/payme/webhook — never skip this.
 */
export function verifyPaymeWebhookAuth(request: Request): boolean {
  if (!env.PAYME_SECRET_KEY) return false;
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return false;
  const login = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return login === 'Paycom' && timingSafeEqual(password, env.PAYME_SECRET_KEY);
}

type OrderRow = {
  id: string;
  businessId: string;
  planId: string;
  amountUzs: number;
  status: string;
  paymeTransactionId: string | null;
  paymeState: number | null;
  paymeCreateTime: number | null;
  paymePerformTime: number | null;
  paymeCancelTime: number | null;
  paymeReason: number | null;
};

const selectOrder = `SELECT id, business_id AS businessId, plan_id AS planId, amount_uzs AS amountUzs, status,
  payme_transaction_id AS paymeTransactionId, payme_state AS paymeState,
  payme_create_time AS paymeCreateTime, payme_perform_time AS paymePerformTime,
  payme_cancel_time AS paymeCancelTime, payme_reason AS paymeReason
  FROM business_plan_orders`;

async function findOrderByAccount(db: D1Database, orderId: unknown) {
  if (typeof orderId !== 'string' || !orderId) return null;
  return db.prepare(`${selectOrder} WHERE id = ?1`).bind(orderId).first<OrderRow>();
}

async function findOrderByTransactionId(db: D1Database, transactionId: unknown) {
  if (typeof transactionId !== 'string' || !transactionId) return null;
  return db.prepare(`${selectOrder} WHERE payme_transaction_id = ?1`).bind(transactionId).first<OrderRow>();
}

function requireMatchingAmount(order: OrderRow, amount: unknown) {
  if (typeof amount !== 'number' || Math.round(order.amountUzs * 100) !== amount) {
    throw new PaymeRpcError(PaymeErrorCode.INVALID_AMOUNT, 'Amount is invalid.');
  }
}

async function checkPerformTransaction(db: D1Database, params: Record<string, unknown>) {
  const account = params.account as Record<string, unknown> | undefined;
  const order = await findOrderByAccount(db, account?.order_id);
  if (!order) throw new PaymeRpcError(PaymeErrorCode.ORDER_NOT_FOUND, 'Order not found.');
  if (order.status !== 'PENDING') throw new PaymeRpcError(PaymeErrorCode.ORDER_ALREADY_PROCESSED, 'Order is already processed.');
  requireMatchingAmount(order, params.amount);
  return { allow: true };
}

async function createTransaction(db: D1Database, params: Record<string, unknown>) {
  const transactionId = params.id;
  if (typeof transactionId !== 'string' || !transactionId) throw new PaymeRpcError(PaymeErrorCode.TRANSACTION_NOT_FOUND, 'Transaction id is required.');

  // Payme retries CreateTransaction on network doubt — answering from the existing row keeps
  // a retry idempotent instead of erroring or double-charging.
  const existing = await findOrderByTransactionId(db, transactionId);
  if (existing) {
    if (existing.paymeState !== 1) throw new PaymeRpcError(PaymeErrorCode.CANNOT_PERFORM_OR_CANCEL, 'Transaction is no longer active.');
    return { create_time: existing.paymeCreateTime, transaction: existing.id, state: existing.paymeState };
  }

  const account = params.account as Record<string, unknown> | undefined;
  const order = await findOrderByAccount(db, account?.order_id);
  if (!order) throw new PaymeRpcError(PaymeErrorCode.ORDER_NOT_FOUND, 'Order not found.');
  if (order.paymeTransactionId) throw new PaymeRpcError(PaymeErrorCode.ORDER_ALREADY_PROCESSED, 'Order already has a transaction.');
  if (order.status !== 'PENDING') throw new PaymeRpcError(PaymeErrorCode.ORDER_ALREADY_PROCESSED, 'Order is already processed.');
  requireMatchingAmount(order, params.amount);

  const createTime = typeof params.time === 'number' ? params.time : Date.now();
  await db
    .prepare(`UPDATE business_plan_orders SET payme_transaction_id = ?1, payme_state = 1, payme_create_time = ?2 WHERE id = ?3`)
    .bind(transactionId, createTime, order.id)
    .run();
  return { create_time: createTime, transaction: order.id, state: 1 };
}

async function performTransaction(db: D1Database, params: Record<string, unknown>) {
  const order = await findOrderByTransactionId(db, params.id);
  if (!order) throw new PaymeRpcError(PaymeErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found.');
  if (order.paymeState === 2) return { transaction: order.id, perform_time: order.paymePerformTime, state: 2 };
  if (order.paymeState !== 1) throw new PaymeRpcError(PaymeErrorCode.CANNOT_PERFORM_OR_CANCEL, 'Transaction cannot be performed.');

  const performTime = Date.now();
  await db.batch([
    db
      .prepare(`UPDATE business_plan_orders SET payme_state = 2, payme_perform_time = ?1, status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = ?2`)
      .bind(performTime, order.id),
    // The only place a payment actually upgrades a business's plan — see
    // modules/billing/nfcstore-discount.ts for the same "one place computes/applies this"
    // discipline. Manual admin plan assignment (POST /api/v1/admin/businesses/:id/plan)
    // still works independently for support cases (comps, manual bank transfers, etc).
    db
      .prepare(`UPDATE businesses SET plan_id = ?1, subscription_status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?2`)
      .bind(order.planId, order.businessId),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
        VALUES (?1, NULL, ?2, 'business.plan.paid_via_payme', 'BusinessPlanOrder', ?3, ?4)`)
      .bind(crypto.randomUUID(), order.businessId, order.id, JSON.stringify({ planId: order.planId, amountUzs: order.amountUzs, paymeTransactionId: params.id })),
  ]);
  return { transaction: order.id, perform_time: performTime, state: 2 };
}

async function cancelTransaction(db: D1Database, params: Record<string, unknown>) {
  const order = await findOrderByTransactionId(db, params.id);
  if (!order) throw new PaymeRpcError(PaymeErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found.');
  if (order.paymeState === -1 || order.paymeState === -2) {
    return { transaction: order.id, cancel_time: order.paymeCancelTime, state: order.paymeState };
  }

  const cancelTime = Date.now();
  const reason = typeof params.reason === 'number' ? params.reason : null;
  const nextState = order.paymeState === 2 ? -2 : -1;
  const statements = [
    db
      .prepare(`UPDATE business_plan_orders SET payme_state = ?1, payme_cancel_time = ?2, payme_reason = ?3, status = 'CANCELED', canceled_at = CURRENT_TIMESTAMP WHERE id = ?4`)
      .bind(nextState, cancelTime, reason, order.id),
  ];
  if (nextState === -2) {
    // A completed payment was reversed (refund/chargeback) — revert the plan it paid for,
    // but only if the business hasn't since moved to a different plan of its own accord
    // (an admin's later manual change must never be silently clobbered by a stale reversal).
    statements.push(
      db
        .prepare(`UPDATE businesses SET plan_id = 'plan_free', subscription_status = 'CANCELED', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND plan_id = ?2`)
        .bind(order.businessId, order.planId),
    );
  }
  await db.batch(statements);
  return { transaction: order.id, cancel_time: cancelTime, state: nextState };
}

async function checkTransaction(db: D1Database, params: Record<string, unknown>) {
  const order = await findOrderByTransactionId(db, params.id);
  if (!order) throw new PaymeRpcError(PaymeErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found.');
  return {
    create_time: order.paymeCreateTime,
    perform_time: order.paymePerformTime ?? 0,
    cancel_time: order.paymeCancelTime ?? 0,
    transaction: order.id,
    state: order.paymeState,
    reason: order.paymeReason ?? null,
  };
}

async function getStatement(db: D1Database, params: Record<string, unknown>) {
  const from = typeof params.from === 'number' ? params.from : 0;
  const to = typeof params.to === 'number' ? params.to : Date.now();
  const result = await db
    .prepare(`${selectOrder} WHERE payme_create_time BETWEEN ?1 AND ?2 AND payme_transaction_id IS NOT NULL ORDER BY payme_create_time ASC`)
    .bind(from, to)
    .all<OrderRow>();
  return {
    transactions: result.results.map((order) => ({
      id: order.paymeTransactionId,
      time: order.paymeCreateTime,
      amount: Math.round(order.amountUzs * 100),
      account: { order_id: order.id },
      create_time: order.paymeCreateTime,
      perform_time: order.paymePerformTime ?? 0,
      cancel_time: order.paymeCancelTime ?? 0,
      transaction: order.id,
      state: order.paymeState,
      reason: order.paymeReason ?? null,
    })),
  };
}

/** Dispatches one Payme Merchant API JSON-RPC method against `business_plan_orders`. Throws
 * PaymeRpcError for anything the webhook route should report back as a JSON-RPC error. */
export async function handlePaymeMethod(db: D1Database, method: string, params: Record<string, unknown>) {
  switch (method) {
    case 'CheckPerformTransaction':
      return checkPerformTransaction(db, params);
    case 'CreateTransaction':
      return createTransaction(db, params);
    case 'PerformTransaction':
      return performTransaction(db, params);
    case 'CancelTransaction':
      return cancelTransaction(db, params);
    case 'CheckTransaction':
      return checkTransaction(db, params);
    case 'GetStatement':
      return getStatement(db, params);
    default:
      throw new PaymeRpcError(PaymeErrorCode.METHOD_NOT_FOUND, 'Method not found.');
  }
}

export { PaymeRpcError };
