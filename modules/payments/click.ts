import { createHash } from 'node:crypto';

import { STATE, cancelCreatedPayment, findOrder, findPayment, insertPayment, performPayment } from './service';

// Click SHOP API: Click's servers post (form-encoded) to the Prepare and
// Complete URLs. Every request is signed with MD5 over its fields and the
// service secret key; amounts are in so'm ("299000.00"). merchant_trans_id is
// the billing request id, merchant_prepare_id / merchant_confirm_id is the
// payment's row number. Replays of the same click_trans_id never create a
// second payment.

export const CLICK_ERROR = {
  OK: 0,
  SIGN: -1,
  AMOUNT: -2,
  ACTION: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  UPDATE_FAILED: -7,
  BAD_REQUEST: -8,
  CANCELLED: -9,
} as const;

const NOTES: Record<number, string> = {
  0: 'Success',
  [-1]: 'SIGN CHECK FAILED',
  [-2]: 'Incorrect parameter amount',
  [-3]: 'Action not found',
  [-4]: 'Already paid',
  [-5]: 'Order not found',
  [-6]: 'Transaction does not exist',
  [-7]: 'Failed to update order',
  [-8]: 'Error in request from click',
  [-9]: 'Transaction cancelled',
};

export type ClickParams = Record<string, string | undefined>;
export type ClickResponse = {
  click_trans_id: string | null;
  merchant_trans_id: string | null;
  merchant_prepare_id?: number;
  merchant_confirm_id?: number;
  error: number;
  error_note: string;
};

const md5 = (value: string) => createHash('md5').update(value).digest('hex');

/** MD5(click_trans_id + service_id + secret + merchant_trans_id [+ merchant_prepare_id] + amount + action + sign_time). */
export function clickSign(params: ClickParams, secretKey: string, withPrepareId: boolean) {
  const parts = [params.click_trans_id, params.service_id, secretKey, params.merchant_trans_id, ...(withPrepareId ? [params.merchant_prepare_id] : []), params.amount, params.action, params.sign_time];
  return md5(parts.map((part) => part ?? '').join(''));
}

function signValid(params: ClickParams, secretKey: string, withPrepareId: boolean) {
  const expected = clickSign(params, secretKey, withPrepareId);
  const received = (params.sign_string ?? '').toLowerCase();
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) diff |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  return diff === 0;
}

/** "299000", "299000.0" and "299000.00" all match 299 000 so'm; 299000.5 does not. */
function amountMatches(received: string | undefined, amountUzs: number) {
  const value = Number((received ?? '').trim());
  return Number.isFinite(value) && Math.round(value * 100) === amountUzs * 100;
}

export const clickFail = (params: ClickParams, error: number): ClickResponse => ({
  click_trans_id: params.click_trans_id ?? null,
  merchant_trans_id: params.merchant_trans_id ?? null,
  error,
  error_note: NOTES[error] ?? NOTES[-8],
});

export async function handleClickPrepare(db: D1Database, params: ClickParams, config: { serviceId: string; secretKey: string }, now = new Date()): Promise<ClickResponse> {
  if (!signValid(params, config.secretKey, false)) return clickFail(params, CLICK_ERROR.SIGN);
  if (params.service_id !== config.serviceId) return clickFail(params, CLICK_ERROR.BAD_REQUEST);
  if (params.action !== '0') return clickFail(params, CLICK_ERROR.ACTION);
  const transactionId = params.click_trans_id ?? '';
  if (!transactionId) return clickFail(params, CLICK_ERROR.BAD_REQUEST);

  const order = params.merchant_trans_id ? await findOrder(db, params.merchant_trans_id) : null;
  if (!order) return clickFail(params, CLICK_ERROR.ORDER_NOT_FOUND);
  if (!amountMatches(params.amount, order.amountUzs)) return clickFail(params, CLICK_ERROR.AMOUNT);
  if (order.status === 'PAID') return clickFail(params, CLICK_ERROR.ALREADY_PAID);
  if (order.status !== 'PENDING') return clickFail(params, CLICK_ERROR.CANCELLED);

  // A repeated Prepare returns the same prepare id instead of a second payment.
  const payment = (await findPayment(db, 'CLICK', transactionId))
    ?? (await insertPayment(db, { order, provider: 'CLICK', providerTransactionId: transactionId, meta: { click_paydoc_id: params.click_paydoc_id ?? '' }, now }));
  if (payment.billingRequestId !== order.id) return clickFail(params, CLICK_ERROR.TRANSACTION_NOT_FOUND);
  if (payment.state === STATE.PERFORMED) return clickFail(params, CLICK_ERROR.ALREADY_PAID);
  if (payment.state !== STATE.CREATED) return clickFail(params, CLICK_ERROR.CANCELLED);
  return { click_trans_id: transactionId, merchant_trans_id: order.id, merchant_prepare_id: payment.rowid, error: CLICK_ERROR.OK, error_note: NOTES[0] };
}

export async function handleClickComplete(db: D1Database, params: ClickParams, config: { serviceId: string; secretKey: string }, now = new Date()): Promise<ClickResponse> {
  if (!signValid(params, config.secretKey, true)) return clickFail(params, CLICK_ERROR.SIGN);
  if (params.service_id !== config.serviceId) return clickFail(params, CLICK_ERROR.BAD_REQUEST);
  if (params.action !== '1') return clickFail(params, CLICK_ERROR.ACTION);

  const payment = params.click_trans_id ? await findPayment(db, 'CLICK', params.click_trans_id) : null;
  if (!payment || String(payment.rowid) !== params.merchant_prepare_id || payment.billingRequestId !== params.merchant_trans_id) {
    return clickFail(params, CLICK_ERROR.TRANSACTION_NOT_FOUND);
  }
  // Click reports a failed or cancelled payment with a negative error: the order stays open.
  if (Number(params.error) < 0) {
    if (payment.state === STATE.CREATED) await cancelCreatedPayment(db, payment, Number(params.error), now);
    return payment.state === STATE.PERFORMED ? clickFail(params, CLICK_ERROR.ALREADY_PAID) : clickFail(params, CLICK_ERROR.CANCELLED);
  }
  if (payment.state === STATE.PERFORMED) return clickFail(params, CLICK_ERROR.ALREADY_PAID);
  if (payment.state !== STATE.CREATED) return clickFail(params, CLICK_ERROR.CANCELLED);

  const order = await findOrder(db, payment.billingRequestId);
  if (!order) return clickFail(params, CLICK_ERROR.ORDER_NOT_FOUND);
  if (!amountMatches(params.amount, order.amountUzs)) return clickFail(params, CLICK_ERROR.AMOUNT);
  if (order.status === 'PAID') return clickFail(params, CLICK_ERROR.ALREADY_PAID);
  if (order.status !== 'PENDING') return clickFail(params, CLICK_ERROR.CANCELLED);

  const performed = await performPayment(db, payment, order, now).catch(() => null);
  if (!performed) return clickFail(params, CLICK_ERROR.UPDATE_FAILED);
  return { click_trans_id: params.click_trans_id ?? null, merchant_trans_id: order.id, merchant_confirm_id: performed.rowid, error: CLICK_ERROR.OK, error_note: NOTES[0] };
}

/** Form-encoded like Click sends it; JSON is accepted too. */
export async function readClickParams(request: Request): Promise<ClickParams | null> {
  try {
    if ((request.headers.get('content-type') ?? '').includes('application/json')) {
      const body = (await request.json()) as Record<string, unknown>;
      // Only plain values count; a nested object is not a Click field.
      const plain = (value: unknown) => (typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'bigint' ? String(value) : undefined);
      return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, plain(value)]));
    }
    const form = await request.formData();
    const params: ClickParams = {};
    for (const [key, value] of form.entries()) params[key] = typeof value === 'string' ? value : undefined;
    return params;
  } catch {
    return null;
  }
}
