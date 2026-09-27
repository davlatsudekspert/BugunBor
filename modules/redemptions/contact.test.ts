import { describe, expect, it } from 'vitest';

import { toDbTime } from '@/lib/time';
import { NOW, SECRET, marketplace } from '@/test/fixtures';
import { processNotifications } from '@/modules/notifications/service';
import { listReports, reportCodeIssue, resolveReport } from '@/modules/reports';
import { cancelBooking, messageBooking, sentMessages } from './contact';
import { noShowState } from './no-shows';
import { cancelRedemption, claimDeal, listCustomerRedemptions } from './service';

const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string; message?: string }) => error.code ?? error.message ?? 'UNKNOWN');
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

async function world() {
  const db = await marketplace();
  // Plenty of stock for ten days; Alice can get Telegram messages.
  await db.batch([
    db.prepare(`UPDATE deals SET total_quantity = 10, remaining_quantity = 10, ends_at = ?1 WHERE id = 'deal'`).bind(toDbTime(later(10 * 24 * 60))),
    db.prepare(`UPDATE users SET telegram_user_id = '1001' WHERE id = 'alice'`),
  ]);
  return db;
}

let keys = 0;
const claim = (db: D1Database, userId: string, now: Date) =>
  claimDeal(db, { dealId: 'deal', branchId: 'br1', userId, idempotencyKey: `key-${userId}-${String(++keys).padStart(6, '0')}`, secret: SECRET, now });

function telegram() {
  const sent: Array<{ chatId: string; text: string; url: string }> = [];
  return {
    sent,
    sender: {
      async sendMessage(chatId: number | string, text: string, markup?: unknown) {
        sent.push({ chatId: String(chatId), text, url: (markup as { inline_keyboard: Array<Array<{ url: string }>> }).inline_keyboard[0][0].url });
      },
    },
  };
}

const stock = async (db: D1Database) => (await db.prepare(`SELECT remaining_quantity AS n FROM deals WHERE id = 'deal'`).first<{ n: number }>())?.n;

describe('a business talks to a person who booked, without their number', () => {
  it('ready messages go once each, only about its own active bookings', async () => {
    const db = await world();
    const code = await claim(db, 'alice', NOW);
    expect(await messageBooking(db, { businessId: 'biz', staffUserId: 'cashier', redemptionId: code.id, message: 'WAITING' }, later(5))).toEqual({ sent: true });
    // The same message again is not sent twice; the other one is.
    expect(await messageBooking(db, { businessId: 'biz', staffUserId: 'cashier', redemptionId: code.id, message: 'WAITING' }, later(6))).toEqual({ sent: false });
    expect(await messageBooking(db, { businessId: 'biz', staffUserId: 'owner', redemptionId: code.id, message: 'DELAY' }, later(7))).toEqual({ sent: true });
    expect(await sentMessages(db, [code.id])).toEqual(new Map([[code.id, ['DELAY', 'WAITING']]]));
    expect(await errorCode(messageBooking(db, { businessId: 'other', staffUserId: 'cashier', redemptionId: code.id, message: 'WAITING' }, later(8)))).toBe('CODE_NOT_FOUND');
    expect(await errorCode(messageBooking(db, { businessId: 'biz', staffUserId: 'cashier', redemptionId: code.id, message: 'WAITING' }, later(61)))).toBe('CODE_EXPIRED');

    const { sender, sent } = telegram();
    await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(8) });
    expect(sent.map((message) => message.text)).toEqual([
      '🙌 <b>Kafe</b>: sizni kutyapmiz! «Osh» uchun kodingizni kassada ko‘rsating.',
      '⏳ <b>Kafe</b>: «Osh»ni tayyorlash biroz vaqt oladi. Iltimos, biroz kuting.',
    ]);
    expect(sent[0].url).toBe('https://bugunbor.uz/account/codes');
  });

  it('a cancelled booking says why, and its unit goes back', async () => {
    const db = await world();
    const code = await claim(db, 'alice', NOW);
    expect(await stock(db)).toBe(9);
    await cancelBooking(db, { businessId: 'biz', staffUserId: 'cashier', redemptionId: code.id, reason: 'OUT_OF_STOCK' }, later(5));
    expect(await stock(db)).toBe(10);
    expect(await errorCode(cancelBooking(db, { businessId: 'biz', staffUserId: 'cashier', redemptionId: code.id, reason: 'CLOSED' }, later(6)))).toBe('CODE_CANCELED');
    const [mine] = await listCustomerRedemptions(db, 'alice', SECRET, later(7));
    expect(mine).toMatchObject({ status: 'CANCELED', cancelReason: 'OUT_OF_STOCK', code: null });

    const { sender, sent } = telegram();
    await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(7) });
    expect(sent.map((message) => message.text)).toEqual(['😔 <b>Kafe</b>: afsuski, «Osh» tugadi. Bron bekor qilindi, uzr so‘raymiz.']);
    // A booking the business cancelled is not the person's no-show.
    expect(await noShowState(db, 'alice', later(8))).toEqual({ count: 0, pausedUntil: null });
  });
});

describe('booking and never coming', () => {
  it('three unused codes in a week pause booking for a day from the last one', async () => {
    const db = await world();
    // Each code lives an hour and runs out unused.
    await claim(db, 'alice', NOW);
    await claim(db, 'alice', later(61));
    expect(await noShowState(db, 'alice', later(122))).toEqual({ count: 2, pausedUntil: null });
    // Cancelling yourself does not count.
    const cancelled = await claim(db, 'alice', later(122));
    await cancelRedemption(db, { redemptionId: cancelled.id, userId: 'alice', now: later(123) });
    await claim(db, 'alice', later(124));
    expect(await noShowState(db, 'alice', later(185))).toEqual({ count: 3, pausedUntil: toDbTime(later(184 + 24 * 60)) });
    expect(await errorCode(claim(db, 'alice', later(186)))).toBe('NO_SHOW_PAUSE');
    // Other people are not affected, and a day after the last one it is over.
    expect(await errorCode(claim(db, 'bob', later(186)))).toBe('OK');
    expect(await errorCode(claim(db, 'alice', later(185 + 24 * 60)))).toBe('OK');
  });

  it('a code the person complained about is not a no-show, unless a moderator dismissed the complaint', async () => {
    const db = await world();
    await claim(db, 'alice', NOW);
    const refused = await claim(db, 'alice', later(61));
    await reportCodeIssue(db, { userId: 'alice', redemptionId: refused.id, issue: 'CODE_REFUSED', comment: null }, later(70));
    await claim(db, 'alice', later(122));
    expect(await noShowState(db, 'alice', later(185))).toEqual({ count: 2, pausedUntil: null });
    const [report] = await listReports(db, { status: 'NEW' });
    await resolveReport(db, { actorId: 'mod', reportId: report.id, status: 'DISMISSED' }, later(186));
    expect(await noShowState(db, 'alice', later(187))).toMatchObject({ count: 3 });
  });
});

describe('what the log keeps', () => {
  it('a message sent twice is logged once', async () => {
    const db = await world();
    const code = await claim(db, 'alice', NOW);
    await messageBooking(db, { businessId: 'biz', staffUserId: 'cashier', redemptionId: code.id, message: 'WAITING' }, later(1));
    expect(await messageBooking(db, { businessId: 'biz', staffUserId: 'cashier', redemptionId: code.id, message: 'WAITING' }, later(2))).toEqual({ sent: false });
    const logged = await db.prepare(`SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'redemption.messaged'`).first<{ n: number }>();
    expect(logged?.n).toBe(1);
  });
});
