import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { NOW, marketplace } from '@/test/fixtures';
import { CLICK_ERROR, clickSign, handleClickComplete, handleClickPrepare, type ClickParams } from './click';
import { PAYME_ERROR, handlePayme, paymeAuthorized } from './payme';
import { PAYME_TIMEOUT_MS, callbackOpen, checkoutAvailable, clickCheckoutUrl, createOrder, paymeCheckoutUrl } from './service';

// No real money anywhere: Payme and Click are simulated by calling the same
// handlers their servers reach, with made-up keys.

const PAYME_KEY = 'test-payme-key';
const CLICK = { serviceId: '31337', secretKey: 'test-click-secret' };
const later = (ms: number) => new Date(NOW.getTime() + ms);

async function setup() {
  const db = await marketplace();
  await db.prepare(`UPDATE app_settings SET value = '1' WHERE key = 'tariffs_enabled'`).run();
  const order = await createOrder(db, { businessId: 'biz', userId: 'owner', planCode: 'BIZNES', months: 3 }, NOW);
  return { db, order, tiyin: order.amount * 100 };
}

const business = (db: D1Database) =>
  db.prepare(`SELECT plan_code AS planCode, paid_until AS paidUntil FROM businesses WHERE id = 'biz'`).first<{ planCode: string | null; paidUntil: string | null }>();
const orderStatus = async (db: D1Database, id: string) => (await db.prepare(`SELECT status FROM billing_requests WHERE id = ?1`).bind(id).first<{ status: string }>())?.status;

let rpcId = 1;
const payme = (db: D1Database, method: string, params: Record<string, unknown>, now = NOW) =>
  handlePayme(db, { id: rpcId++, method, params }, { now });

describe('switches', () => {
  const configured = { payme: { merchantId: 'm', key: 'k', sandbox: true, fiscal: null }, click: { serviceId: 's', merchantId: 'c', secretKey: 'x', sandbox: false } };

  it('keep checkout off until PAYMENTS_ENABLED and the provider secrets are set', () => {
    expect(checkoutAvailable({ enabled: false, ...configured }, 'PAYME')).toBe(false);
    expect(checkoutAvailable({ enabled: true, payme: null, click: null }, 'PAYME')).toBe(false);
    expect(checkoutAvailable({ enabled: true, ...configured }, 'CLICK')).toBe(true);
  });

  it('let the provider test its callback only in sandbox while payments are off', () => {
    expect(callbackOpen({ enabled: false, ...configured }, 'PAYME')).toBe(true);
    expect(callbackOpen({ enabled: false, ...configured }, 'CLICK')).toBe(false);
    expect(callbackOpen({ enabled: false, payme: null, click: null }, 'PAYME')).toBe(false);
    expect(callbackOpen({ enabled: true, ...configured }, 'CLICK')).toBe(true);
  });

  it('build checkout links from the order, never from the browser', () => {
    const order = { id: 'order-1', amountUzs: 849000 };
    const link = paymeCheckoutUrl({ merchantId: 'MERCHANT', sandbox: true }, order, 'https://bugunbor.uz/business/billing/return/order-1', 'uz');
    expect(link.startsWith('https://test.paycom.uz/')).toBe(true);
    expect(atob(link.slice('https://test.paycom.uz/'.length))).toBe('m=MERCHANT;ac.order_id=order-1;a=84900000;c=https://bugunbor.uz/business/billing/return/order-1;l=uz');
    expect(paymeCheckoutUrl({ merchantId: 'MERCHANT', sandbox: false }, order, 'x', 'ru').startsWith('https://checkout.paycom.uz/')).toBe(true);
    const click = new URL(clickCheckoutUrl({ serviceId: '1', merchantId: '2' }, order, 'https://bugunbor.uz/r'));
    expect(Object.fromEntries(click.searchParams)).toEqual({ service_id: '1', merchant_id: '2', amount: '849000', transaction_param: 'order-1', return_url: 'https://bugunbor.uz/r' });
  });
});

describe('Payme Merchant API', () => {
  it('checks Basic auth "Paycom:<key>" and nothing else', () => {
    expect(paymeAuthorized(`Basic ${btoa(`Paycom:${PAYME_KEY}`)}`, PAYME_KEY)).toBe(true);
    expect(paymeAuthorized(`Basic ${btoa('Paycom:wrong')}`, PAYME_KEY)).toBe(false);
    expect(paymeAuthorized(`Basic ${btoa(`Other:${PAYME_KEY}`)}`, PAYME_KEY)).toBe(false);
    expect(paymeAuthorized('Bearer abc', PAYME_KEY)).toBe(false);
    expect(paymeAuthorized(null, PAYME_KEY)).toBe(false);
    expect(paymeAuthorized('Basic !!!', PAYME_KEY)).toBe(false);
  });

  it('pays an order end to end and switches the plan on exactly once', async () => {
    const { db, order, tiyin } = await setup();
    const account = { order_id: order.id };
    expect((await payme(db, 'CheckPerformTransaction', { amount: tiyin, account })).result).toEqual({ allow: true });

    const created = await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account });
    expect(created.result).toMatchObject({ create_time: NOW.getTime(), state: 1 });
    // A duplicate CreateTransaction repeats the same answer.
    expect((await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account }, later(1000))).result).toEqual(created.result);
    expect(await orderStatus(db, order.id)).toBe('PENDING');

    const performed = await payme(db, 'PerformTransaction', { id: 'pm-1' }, later(5000));
    expect(performed.result).toMatchObject({ perform_time: later(5000).getTime(), state: 2 });
    expect(await orderStatus(db, order.id)).toBe('PAID');
    const afterPay = await business(db);
    expect(afterPay).toEqual({ planCode: 'BIZNES', paidUntil: '2026-12-25 10:00:05' });

    // A duplicate PerformTransaction changes nothing and repeats perform_time.
    expect((await payme(db, 'PerformTransaction', { id: 'pm-1' }, later(9000))).result).toEqual(performed.result);
    expect(await business(db)).toEqual(afterPay);

    const checked = await payme(db, 'CheckTransaction', { id: 'pm-1' });
    expect(checked.result).toMatchObject({ create_time: NOW.getTime(), perform_time: later(5000).getTime(), cancel_time: 0, state: 2, reason: null });

    const statement = await payme(db, 'GetStatement', { from: NOW.getTime() - 1000, to: NOW.getTime() + 1000 });
    expect(statement.result).toMatchObject({ transactions: [{ id: 'pm-1', amount: tiyin, account: { order_id: order.id }, state: 2 }] });
    const empty = await payme(db, 'GetStatement', { from: 0, to: NOW.getTime() - 1 });
    expect(empty.result).toEqual({ transactions: [] });

    // The order is closed now.
    expect((await payme(db, 'CheckPerformTransaction', { amount: tiyin, account })).error?.code).toBe(PAYME_ERROR.ORDER_UNAVAILABLE);
  });

  it('rejects unknown orders, wrong amounts and a second transaction for a busy order', async () => {
    const { db, order, tiyin } = await setup();
    expect((await payme(db, 'CheckPerformTransaction', { amount: tiyin, account: { order_id: 'nope' } })).error?.code).toBe(PAYME_ERROR.ORDER_NOT_FOUND);
    expect((await payme(db, 'CheckPerformTransaction', { amount: tiyin + 100, account: { order_id: order.id } })).error?.code).toBe(PAYME_ERROR.INVALID_AMOUNT);
    expect((await payme(db, 'CheckPerformTransaction', { amount: order.amount, account: { order_id: order.id } })).error?.code).toBe(PAYME_ERROR.INVALID_AMOUNT);
    expect((await payme(db, 'CreateTransaction', { id: 'pm-x', time: NOW.getTime(), amount: tiyin - 1, account: { order_id: order.id } })).error?.code).toBe(PAYME_ERROR.INVALID_AMOUNT);

    await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } });
    const second = await payme(db, 'CreateTransaction', { id: 'pm-2', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } });
    expect(second.error?.code).toBe(PAYME_ERROR.ORDER_BUSY);
    expect(second.error?.code).toBeLessThanOrEqual(-31050);
    expect(second.error?.code).toBeGreaterThanOrEqual(-31099);

    expect((await payme(db, 'PerformTransaction', { id: 'missing' })).error?.code).toBe(PAYME_ERROR.TRANSACTION_NOT_FOUND);
    expect((await payme(db, 'CheckTransaction', { id: 'missing' })).error?.code).toBe(PAYME_ERROR.TRANSACTION_NOT_FOUND);
    expect((await payme(db, 'Unknown', {})).error?.code).toBe(PAYME_ERROR.METHOD_NOT_FOUND);
  });

  it('cancels a created transaction, keeps the order open and repeats the answer', async () => {
    const { db, order, tiyin } = await setup();
    await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } });
    const cancelled = await payme(db, 'CancelTransaction', { id: 'pm-1', reason: 3 }, later(2000));
    expect(cancelled.result).toMatchObject({ cancel_time: later(2000).getTime(), state: -1 });
    expect((await payme(db, 'CancelTransaction', { id: 'pm-1', reason: 3 }, later(8000))).result).toEqual(cancelled.result);
    expect((await payme(db, 'PerformTransaction', { id: 'pm-1' })).error?.code).toBe(PAYME_ERROR.CANT_PERFORM);
    expect((await payme(db, 'CheckTransaction', { id: 'pm-1' })).result).toMatchObject({ state: -1, reason: 3 });
    expect(await orderStatus(db, order.id)).toBe('PENDING');
    expect((await business(db))?.paidUntil).toBeNull();
    // After a cancelled attempt the order can be paid with a new transaction.
    expect((await payme(db, 'CreateTransaction', { id: 'pm-2', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } })).result).toMatchObject({ state: 1 });
  });

  it('takes the paid period back when a performed payment is refunded', async () => {
    const { db, order, tiyin } = await setup();
    await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } });
    await payme(db, 'PerformTransaction', { id: 'pm-1' });
    const refunded = await payme(db, 'CancelTransaction', { id: 'pm-1', reason: 5 }, later(60_000));
    expect(refunded.result).toMatchObject({ state: -2, cancel_time: later(60_000).getTime() });
    expect(await orderStatus(db, order.id)).toBe('REFUNDED');
    expect((await business(db))?.paidUntil).toBe('2026-09-25 10:00:00');
    expect((await payme(db, 'CheckTransaction', { id: 'pm-1' })).result).toMatchObject({ state: -2, reason: 5 });
  });

  it('never performs a transaction older than 12 hours', async () => {
    const { db, order, tiyin } = await setup();
    const tooOld = await payme(db, 'CreateTransaction', { id: 'pm-old', time: NOW.getTime() - PAYME_TIMEOUT_MS - 1, amount: tiyin, account: { order_id: order.id } });
    expect(tooOld.error?.code).toBe(PAYME_ERROR.CANT_PERFORM);

    await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } });
    const late = await payme(db, 'PerformTransaction', { id: 'pm-1' }, later(PAYME_TIMEOUT_MS + 1));
    expect(late.error?.code).toBe(PAYME_ERROR.CANT_PERFORM);
    expect((await payme(db, 'CheckTransaction', { id: 'pm-1' })).result).toMatchObject({ state: -1, reason: 4 });
    expect(await orderStatus(db, order.id)).toBe('PENDING');
    expect((await business(db))?.paidUntil).toBeNull();
  });

  it('refuses to perform when the order was closed meanwhile', async () => {
    const { db, order, tiyin } = await setup();
    await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } });
    await db.prepare(`UPDATE billing_requests SET status = 'PAID' WHERE id = ?1`).bind(order.id).run();
    expect((await payme(db, 'PerformTransaction', { id: 'pm-1' })).error?.code).toBe(PAYME_ERROR.CANT_PERFORM);
    expect((await payme(db, 'CheckTransaction', { id: 'pm-1' })).result).toMatchObject({ state: 1 });
    expect((await business(db))?.paidUntil).toBeNull();
  });

  it('adds fiscal receipt lines when the cashbox asks for them', async () => {
    const { db, order, tiyin } = await setup();
    const answer = await handlePayme(db, { id: 1, method: 'CheckPerformTransaction', params: { amount: tiyin, account: { order_id: order.id } } }, { now: NOW, fiscal: { ikpu: '10399002001000000', packageCode: '1500245', vatPercent: 0 } });
    expect(answer.result).toMatchObject({ allow: true, detail: { receipt_type: 0, items: [{ price: tiyin, count: 1, code: '10399002001000000', package_code: '1500245', vat_percent: 0 }] } });
  });
});

describe('Click SHOP API', () => {
  const md5 = (value: string) => createHash('md5').update(value).digest('hex');
  const signed = (params: ClickParams, withPrepareId: boolean) => ({ ...params, sign_string: clickSign(params, CLICK.secretKey, withPrepareId) });

  function prepareParams(orderId: string, amount: string, overrides: ClickParams = {}): ClickParams {
    return signed({ click_trans_id: '900001', service_id: CLICK.serviceId, click_paydoc_id: '55501', merchant_trans_id: orderId, amount, action: '0', error: '0', error_note: 'Success', sign_time: '2026-09-25 15:00:00', ...overrides }, false);
  }
  const completeParams = (orderId: string, amount: string, prepareId: number, overrides: ClickParams = {}) =>
    signed({ click_trans_id: '900001', service_id: CLICK.serviceId, click_paydoc_id: '55501', merchant_trans_id: orderId, merchant_prepare_id: String(prepareId), amount, action: '1', error: '0', error_note: 'Success', sign_time: '2026-09-25 15:00:05', ...overrides }, true);

  it('signs exactly as Click documents it', () => {
    const params = { click_trans_id: '1', service_id: '2', merchant_trans_id: '3', amount: '1000.00', action: '0', sign_time: '2026-09-25 10:00:00' };
    expect(clickSign(params, 'key', false)).toBe(md5('12key31000.0002026-09-25 10:00:00'));
    expect(clickSign({ ...params, merchant_prepare_id: '9', action: '1' }, 'key', true)).toBe(md5('12key391000.0012026-09-25 10:00:00'));
  });

  it('prepares, completes once and switches the plan on', async () => {
    const { db, order } = await setup();
    const prepared = await handleClickPrepare(db, prepareParams(order.id, `${order.amount}.00`), CLICK, NOW);
    expect(prepared).toMatchObject({ error: 0, merchant_trans_id: order.id });
    const again = await handleClickPrepare(db, prepareParams(order.id, `${order.amount}.00`), CLICK, NOW);
    expect(again.merchant_prepare_id).toBe(prepared.merchant_prepare_id);

    const completed = await handleClickComplete(db, completeParams(order.id, `${order.amount}.00`, prepared.merchant_prepare_id!), CLICK, later(5000));
    expect(completed).toMatchObject({ error: 0, merchant_confirm_id: prepared.merchant_prepare_id });
    expect(await orderStatus(db, order.id)).toBe('PAID');
    expect(await business(db)).toEqual({ planCode: 'BIZNES', paidUntil: '2026-12-25 10:00:05' });

    const duplicate = await handleClickComplete(db, completeParams(order.id, `${order.amount}.00`, prepared.merchant_prepare_id!), CLICK, later(9000));
    expect(duplicate.error).toBe(CLICK_ERROR.ALREADY_PAID);
    expect((await business(db))?.paidUntil).toBe('2026-12-25 10:00:05');
    expect((await handleClickPrepare(db, prepareParams(order.id, `${order.amount}.00`, { click_trans_id: '900002' }), CLICK, NOW)).error).toBe(CLICK_ERROR.ALREADY_PAID);
  });

  it('rejects a wrong signature, service, amount, action or order', async () => {
    const { db, order } = await setup();
    const good = prepareParams(order.id, String(order.amount));
    expect((await handleClickPrepare(db, { ...good, sign_string: 'f'.repeat(32) }, CLICK, NOW)).error).toBe(CLICK_ERROR.SIGN);
    expect((await handleClickPrepare(db, { ...good, amount: '1000' }, CLICK, NOW)).error).toBe(CLICK_ERROR.SIGN);
    expect((await handleClickPrepare(db, prepareParams(order.id, '1000.00'), CLICK, NOW)).error).toBe(CLICK_ERROR.AMOUNT);
    expect((await handleClickPrepare(db, prepareParams(order.id, `${order.amount}.50`), CLICK, NOW)).error).toBe(CLICK_ERROR.AMOUNT);
    expect((await handleClickPrepare(db, prepareParams('missing', String(order.amount)), CLICK, NOW)).error).toBe(CLICK_ERROR.ORDER_NOT_FOUND);
    expect((await handleClickPrepare(db, prepareParams(order.id, String(order.amount), { service_id: '999' }), CLICK, NOW)).error).toBe(CLICK_ERROR.BAD_REQUEST);
    expect((await handleClickPrepare(db, prepareParams(order.id, String(order.amount), { action: '1' }), CLICK, NOW)).error).toBe(CLICK_ERROR.ACTION);
    expect((await handleClickPrepare(db, good, { ...CLICK, secretKey: 'other' }, NOW)).error).toBe(CLICK_ERROR.SIGN);

    const prepared = await handleClickPrepare(db, good, CLICK, NOW);
    expect((await handleClickComplete(db, completeParams(order.id, String(order.amount), prepared.merchant_prepare_id! + 1), CLICK, NOW)).error).toBe(CLICK_ERROR.TRANSACTION_NOT_FOUND);
    expect((await handleClickComplete(db, { ...completeParams(order.id, String(order.amount), prepared.merchant_prepare_id!), sign_string: '0'.repeat(32) }, CLICK, NOW)).error).toBe(CLICK_ERROR.SIGN);
    expect((await handleClickComplete(db, completeParams(order.id, '1.00', prepared.merchant_prepare_id!), CLICK, NOW)).error).toBe(CLICK_ERROR.AMOUNT);
    expect(await orderStatus(db, order.id)).toBe('PENDING');
  });

  it('marks a payment Click failed as cancelled and leaves the order open', async () => {
    const { db, order } = await setup();
    const prepared = await handleClickPrepare(db, prepareParams(order.id, String(order.amount)), CLICK, NOW);
    const failed = await handleClickComplete(db, completeParams(order.id, String(order.amount), prepared.merchant_prepare_id!, { error: '-5017', error_note: 'Insufficient funds' }), CLICK, NOW);
    expect(failed.error).toBe(CLICK_ERROR.CANCELLED);
    expect((await handleClickComplete(db, completeParams(order.id, String(order.amount), prepared.merchant_prepare_id!), CLICK, NOW)).error).toBe(CLICK_ERROR.CANCELLED);
    expect(await orderStatus(db, order.id)).toBe('PENDING');
    expect((await business(db))?.paidUntil).toBeNull();
    // A new Click payment for the same order can still go through.
    const retry = await handleClickPrepare(db, prepareParams(order.id, String(order.amount), { click_trans_id: '900003' }), CLICK, NOW);
    expect(retry.error).toBe(0);
  });
});

describe('orders for online payment', () => {
  it('reuse the open order for the same plan and never cancel one with a payment in progress', async () => {
    const { db, order, tiyin } = await setup();
    expect((await createOrder(db, { businessId: 'biz', userId: 'owner', planCode: 'BIZNES', months: 3 }, NOW)).id).toBe(order.id);
    await payme(db, 'CreateTransaction', { id: 'pm-1', time: NOW.getTime(), amount: tiyin, account: { order_id: order.id } });
    const other = await createOrder(db, { businessId: 'biz', userId: 'owner', planCode: 'START', months: 1 }, NOW);
    expect(other.id).not.toBe(order.id);
    expect(await orderStatus(db, order.id)).toBe('PENDING');
    expect((await payme(db, 'PerformTransaction', { id: 'pm-1' })).result).toMatchObject({ state: 2 });
  });
});
