import type { PaymeFiscal } from '@/lib/env';
import { toDbTime } from '@/lib/time';
import {
  PAYME_TIMEOUT_MS,
  STATE,
  cancelCreatedPayment,
  findOrder,
  findPayment,
  hasOpenPayment,
  insertPayment,
  performPayment,
  refundPayment,
  type PaymentRow,
} from './service';

// Payme Merchant API (JSON-RPC 2.0): Payme's servers call POST
// /api/v1/payments/payme with Basic auth "Paycom:<cashbox key>". Amounts are in
// tiyin; the order is `account.order_id` (a billing request id). Behaviour
// follows Payme's specification and its sandbox certification: create_time,
// perform_time and cancel_time are stored once and repeated identically.

export const PAYME_ERROR = {
  INVALID_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  CANT_CANCEL: -31007,
  CANT_PERFORM: -31008,
  ORDER_NOT_FOUND: -31050,
  ORDER_BUSY: -31051,
  ORDER_UNAVAILABLE: -31052,
  SYSTEM: -32400,
  AUTH: -32504,
  METHOD_NOT_FOUND: -32601,
  INVALID_REQUEST: -32600,
  PARSE: -32700,
} as const;

type Message = { uz: string; ru: string; en: string };

const MESSAGES: Record<number, Message> = {
  [PAYME_ERROR.INVALID_AMOUNT]: { uz: 'Summa noto‘g‘ri', ru: 'Неверная сумма', en: 'Invalid amount' },
  [PAYME_ERROR.TRANSACTION_NOT_FOUND]: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' },
  [PAYME_ERROR.CANT_CANCEL]: { uz: 'Tranzaksiyani bekor qilib bo‘lmaydi', ru: 'Невозможно отменить транзакцию', en: 'Transaction cannot be cancelled' },
  [PAYME_ERROR.CANT_PERFORM]: { uz: 'Amalni bajarib bo‘lmaydi', ru: 'Невозможно выполнить операцию', en: 'Operation cannot be performed' },
  [PAYME_ERROR.ORDER_NOT_FOUND]: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
  [PAYME_ERROR.ORDER_BUSY]: { uz: 'Buyurtma boshqa tranzaksiya bilan to‘lanmoqda', ru: 'Заказ оплачивается другой транзакцией', en: 'Order is being paid by another transaction' },
  [PAYME_ERROR.ORDER_UNAVAILABLE]: { uz: 'Buyurtma to‘langan yoki bekor qilingan', ru: 'Заказ уже оплачен или отменён', en: 'Order is already paid or cancelled' },
  [PAYME_ERROR.SYSTEM]: { uz: 'Tizim xatosi', ru: 'Системная ошибка', en: 'System error' },
  [PAYME_ERROR.AUTH]: { uz: 'Ruxsat yo‘q', ru: 'Недостаточно привилегий', en: 'Insufficient privileges' },
  [PAYME_ERROR.METHOD_NOT_FOUND]: { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' },
  [PAYME_ERROR.INVALID_REQUEST]: { uz: 'So‘rov noto‘g‘ri', ru: 'Неверный запрос', en: 'Invalid request' },
  [PAYME_ERROR.PARSE]: { uz: 'JSON o‘qilmadi', ru: 'Ошибка разбора JSON', en: 'Parse error' },
};

type RpcId = string | number | null;
export type PaymeResponse = { jsonrpc: '2.0'; id: RpcId; result?: unknown; error?: { code: number; message: Message; data?: string } };

export const paymeError = (id: RpcId, code: number, data?: string): PaymeResponse => ({
  jsonrpc: '2.0',
  id,
  error: { code, message: MESSAGES[code] ?? MESSAGES[PAYME_ERROR.SYSTEM], ...(data ? { data } : {}) },
});
const ok = (id: RpcId, result: unknown): PaymeResponse => ({ jsonrpc: '2.0', id, result });

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

/** Basic auth "Paycom:<key>". Never logs or returns the key. */
export function paymeAuthorized(header: string | null, key: string) {
  const [scheme, encoded] = (header ?? '').split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  let decoded = '';
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const separator = decoded.indexOf(':');
  return separator > 0 && decoded.slice(0, separator) === 'Paycom' && timingSafeEqual(decoded.slice(separator + 1), key);
}

type Params = { id?: unknown; time?: unknown; amount?: unknown; account?: { order_id?: unknown }; reason?: unknown; from?: unknown; to?: unknown };

const orderIdOf = (params: Params) => (typeof params.account?.order_id === 'string' || typeof params.account?.order_id === 'number' ? String(params.account.order_id) : '');
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function transactionResult(payment: PaymentRow) {
  return {
    create_time: payment.createTime,
    perform_time: payment.performTime ?? 0,
    cancel_time: payment.cancelTime ?? 0,
    transaction: payment.id,
    state: payment.state,
    reason: payment.reason,
  };
}

/** The order can take this Payme payment: it exists, is open and the amount matches (tiyin). */
async function checkOrder(db: D1Database, id: RpcId, params: Params) {
  const orderId = orderIdOf(params);
  const order = orderId ? await findOrder(db, orderId) : null;
  if (!order) return { error: paymeError(id, PAYME_ERROR.ORDER_NOT_FOUND, 'order_id') };
  if (order.status !== 'PENDING') return { error: paymeError(id, PAYME_ERROR.ORDER_UNAVAILABLE, 'order_id') };
  if (!isNumber(params.amount) || params.amount !== order.amountUzs * 100) return { error: paymeError(id, PAYME_ERROR.INVALID_AMOUNT) };
  return { order };
}

/** Receipt lines for fiscalization: one line, the plan for the paid period. */
async function receiptDetail(db: D1Database, order: { planCode: string; months: number; amountUzs: number }, fiscal: PaymeFiscal) {
  const plan = await db.prepare(`SELECT name_uz AS name FROM plans WHERE code = ?1`).bind(order.planCode).first<{ name: string }>();
  const price = order.amountUzs * 100;
  return {
    receipt_type: 0,
    items: [{
      title: `BugunBor: «${plan?.name ?? order.planCode}» tarifi, ${order.months} oy`,
      price,
      count: 1,
      code: fiscal.ikpu,
      package_code: fiscal.packageCode,
      vat_percent: fiscal.vatPercent,
    }],
  };
}

/** Handles one authenticated Merchant API call. */
export async function handlePayme(
  db: D1Database,
  body: { id?: RpcId; method?: unknown; params?: Params },
  options: { fiscal?: PaymeFiscal | null; now?: Date } = {},
): Promise<PaymeResponse> {
  const now = options.now ?? new Date();
  const id = body.id ?? null;
  const params: Params = body.params && typeof body.params === 'object' ? body.params : {};
  const transactionId = typeof params.id === 'string' && params.id ? params.id : '';
  try {
    switch (body.method) {
      case 'CheckPerformTransaction': {
        const checked = await checkOrder(db, id, params);
        if (checked.error) return checked.error;
        return ok(id, options.fiscal ? { allow: true, detail: await receiptDetail(db, checked.order, options.fiscal) } : { allow: true });
      }

      case 'CreateTransaction': {
        if (!transactionId || !isNumber(params.time)) return paymeError(id, PAYME_ERROR.INVALID_REQUEST);
        const existing = await findPayment(db, 'PAYME', transactionId);
        if (existing) {
          if (existing.billingRequestId !== orderIdOf(params)) return paymeError(id, PAYME_ERROR.CANT_PERFORM);
          if (existing.state !== STATE.CREATED) return paymeError(id, PAYME_ERROR.CANT_PERFORM);
          if (now.getTime() - existing.createTime > PAYME_TIMEOUT_MS) {
            await cancelCreatedPayment(db, existing, 4, now);
            return paymeError(id, PAYME_ERROR.CANT_PERFORM);
          }
          return ok(id, { create_time: existing.createTime, transaction: existing.id, state: existing.state });
        }
        const checked = await checkOrder(db, id, params);
        if (checked.error) return checked.error;
        if (await hasOpenPayment(db, checked.order.id)) return paymeError(id, PAYME_ERROR.ORDER_BUSY, 'order_id');
        if (now.getTime() - params.time > PAYME_TIMEOUT_MS) return paymeError(id, PAYME_ERROR.CANT_PERFORM);
        const payment = await insertPayment(db, { order: checked.order, provider: 'PAYME', providerTransactionId: transactionId, providerTime: params.time, now });
        if (payment.billingRequestId !== checked.order.id) return paymeError(id, PAYME_ERROR.CANT_PERFORM);
        return ok(id, { create_time: payment.createTime, transaction: payment.id, state: payment.state });
      }

      case 'PerformTransaction': {
        const payment = transactionId ? await findPayment(db, 'PAYME', transactionId) : null;
        if (!payment) return paymeError(id, PAYME_ERROR.TRANSACTION_NOT_FOUND);
        if (payment.state === STATE.PERFORMED) return ok(id, { transaction: payment.id, perform_time: payment.performTime, state: payment.state });
        if (payment.state !== STATE.CREATED) return paymeError(id, PAYME_ERROR.CANT_PERFORM);
        if (now.getTime() - payment.createTime > PAYME_TIMEOUT_MS) {
          await cancelCreatedPayment(db, payment, 4, now);
          return paymeError(id, PAYME_ERROR.CANT_PERFORM);
        }
        const order = await findOrder(db, payment.billingRequestId);
        if (!order || order.status !== 'PENDING') return paymeError(id, PAYME_ERROR.CANT_PERFORM);
        const performed = await performPayment(db, payment, order, now).catch(() => null);
        if (!performed) return paymeError(id, PAYME_ERROR.CANT_PERFORM);
        return ok(id, { transaction: performed.id, perform_time: performed.performTime, state: performed.state });
      }

      case 'CancelTransaction': {
        const payment = transactionId ? await findPayment(db, 'PAYME', transactionId) : null;
        if (!payment) return paymeError(id, PAYME_ERROR.TRANSACTION_NOT_FOUND);
        const reason = isNumber(params.reason) ? params.reason : null;
        let current = payment;
        if (payment.state === STATE.CREATED) current = await cancelCreatedPayment(db, payment, reason, now);
        else if (payment.state === STATE.PERFORMED) {
          const order = await findOrder(db, payment.billingRequestId);
          if (!order) return paymeError(id, PAYME_ERROR.CANT_CANCEL);
          current = await refundPayment(db, payment, order, reason, now);
        }
        return ok(id, { transaction: current.id, cancel_time: current.cancelTime, state: current.state });
      }

      case 'CheckTransaction': {
        const payment = transactionId ? await findPayment(db, 'PAYME', transactionId) : null;
        if (!payment) return paymeError(id, PAYME_ERROR.TRANSACTION_NOT_FOUND);
        return ok(id, transactionResult(payment));
      }

      case 'GetStatement': {
        if (!isNumber(params.from) || !isNumber(params.to)) return paymeError(id, PAYME_ERROR.INVALID_REQUEST);
        const rows = await db
          .prepare(`SELECT p.id, p.provider_transaction_id AS providerTransactionId, p.amount_uzs AS amountUzs, p.state, p.reason,
              p.provider_time AS providerTime, p.create_time AS createTime, p.perform_time AS performTime, p.cancel_time AS cancelTime,
              p.billing_request_id AS billingRequestId
            FROM payments p WHERE p.provider = 'PAYME' AND p.create_time BETWEEN ?1 AND ?2 ORDER BY p.create_time`)
          .bind(params.from, params.to)
          .all<Omit<PaymentRow, 'rowid' | 'provider'>>();
        return ok(id, {
          transactions: rows.results.map((row) => ({
            id: row.providerTransactionId,
            time: row.providerTime ?? row.createTime,
            amount: row.amountUzs * 100,
            account: { order_id: row.billingRequestId },
            create_time: row.createTime,
            perform_time: row.performTime ?? 0,
            cancel_time: row.cancelTime ?? 0,
            transaction: row.id,
            state: row.state,
            reason: row.reason,
          })),
        });
      }

      case 'SetFiscalData': {
        // Payme sends the fiscal receipt of a performed payment; kept with the payment.
        const payment = transactionId ? await findPayment(db, 'PAYME', transactionId) : null;
        if (!payment) return paymeError(id, PAYME_ERROR.TRANSACTION_NOT_FOUND);
        const fiscal = (params as { fiscal_data?: unknown }).fiscal_data;
        await db.prepare(`UPDATE payments SET meta_json = json_set(COALESCE(meta_json, '{}'), '$.fiscal', json(?2)), updated_at = ?3 WHERE id = ?1`)
          .bind(payment.id, JSON.stringify(fiscal ?? null), toDbTime(now)).run();
        return ok(id, { success: true });
      }

      default:
        return paymeError(id, PAYME_ERROR.METHOD_NOT_FOUND, typeof body.method === 'string' ? body.method : undefined);
    }
  } catch (error) {
    console.error('Payme', typeof body.method === 'string' ? body.method : '?', error instanceof Error ? error.message : 'unknown');
    return paymeError(id, PAYME_ERROR.SYSTEM);
  }
}
