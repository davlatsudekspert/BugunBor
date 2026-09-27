import { describe, expect, it } from 'vitest';

import { toDbTime } from '@/lib/time';
import { NOW, SECRET, marketplace } from '@/test/fixtures';
import { listBusinessDeals, transitionDeal } from '@/modules/deals/service';
import { releaseDealHold } from '@/modules/moderation/service';
import { processNotifications } from '@/modules/notifications/service';
import { claimDeal, completeRedemption } from '@/modules/redemptions/service';
import { codeIssuesOf, listReports, reportCodeIssue } from './reports';

const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string; message?: string }) => error.code ?? error.message ?? 'UNKNOWN');
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

async function world() {
  const db = await marketplace();
  await db.prepare(`UPDATE deals SET total_quantity = 10, remaining_quantity = 10 WHERE id = 'deal'`).run();
  return db;
}

const claim = (db: D1Database, userId: string, now = NOW) =>
  claimDeal(db, { dealId: 'deal', branchId: 'br1', userId, idempotencyKey: `key-${userId}-000001`, secret: SECRET, now });

const dealState = (db: D1Database) =>
  db.prepare(`SELECT status, complaint_hold_at IS NOT NULL AS held FROM deals WHERE id = 'deal'`).first<{ status: string; held: number }>();

const alerts = async (db: D1Database) =>
  (await db.prepare(`SELECT user_id AS userId, payload_json AS payload FROM notifications WHERE kind = 'DEAL_HELD' ORDER BY user_id`).all<{ userId: string; payload: string }>()).results;

describe('complaints about a booked code', () => {
  it('only the person who booked it, within three days; a used code only for the price', async () => {
    const db = await world();
    const code = await claim(db, 'alice');
    expect(await errorCode(reportCodeIssue(db, { userId: 'bob', redemptionId: code.id, issue: 'CODE_REFUSED', comment: null }, later(5)))).toBe('NOT_FOUND');
    expect(await errorCode(reportCodeIssue(db, { userId: 'alice', redemptionId: code.id, issue: 'CODE_REFUSED', comment: null }, later(73 * 60)))).toBe('ISSUE_TOO_LATE');

    const first = await reportCodeIssue(db, { userId: 'alice', redemptionId: code.id, issue: 'NOT_AVAILABLE', comment: ' Osh qolmagan ekan ' }, later(5));
    expect(first).toMatchObject({ repeated: false, held: false });
    // A second word about the same code replaces the first.
    expect(await reportCodeIssue(db, { userId: 'alice', redemptionId: code.id, issue: 'CODE_REFUSED', comment: null }, later(6))).toMatchObject({ repeated: true });
    expect(await codeIssuesOf(db, 'alice')).toEqual(new Map([[code.id, 'CODE_REFUSED']]));

    const other = await marketplace();
    await other.prepare(`UPDATE deals SET total_quantity = 10, remaining_quantity = 10 WHERE id = 'deal'`).run();
    const used = await claim(other, 'bob');
    await completeRedemption(other, { businessId: 'biz', redemptionId: used.id, staffUserId: 'cashier', now: later(10) });
    expect(await errorCode(reportCodeIssue(other, { userId: 'bob', redemptionId: used.id, issue: 'NOT_AVAILABLE', comment: null }, later(20)))).toBe('VALIDATION');
    expect(await errorCode(reportCodeIssue(other, { userId: 'bob', redemptionId: used.id, issue: 'WRONG_PRICE', comment: null }, later(20)))).toBe('OK');
  });

  it('three different people in a week put the deal on hold until a moderator looks', async () => {
    const db = await world();
    const alice = await claim(db, 'alice');
    const bob = await claim(db, 'bob');
    const stranger = await claim(db, 'stranger');
    await reportCodeIssue(db, { userId: 'alice', redemptionId: alice.id, issue: 'NOT_AVAILABLE', comment: null }, later(5));
    // The same person twice still counts once.
    await reportCodeIssue(db, { userId: 'alice', redemptionId: alice.id, issue: 'CODE_REFUSED', comment: null }, later(6));
    expect(await reportCodeIssue(db, { userId: 'bob', redemptionId: bob.id, issue: 'BRANCH_CLOSED', comment: null }, later(7))).toMatchObject({ held: false });
    expect(await dealState(db)).toEqual({ status: 'ACTIVE', held: 0 });

    await db.prepare(`UPDATE users SET telegram_user_id = CASE id WHEN 'owner' THEN '7001' ELSE '7009' END WHERE id IN ('owner', 'mod')`).run();
    expect(await reportCodeIssue(db, { userId: 'stranger', redemptionId: stranger.id, issue: 'CODE_REFUSED', comment: null }, later(8))).toMatchObject({ held: true });
    expect(await dealState(db)).toEqual({ status: 'PAUSED', held: 1 });
    // The team (owner) and the moderator are told, each in their own words.
    const told = await alerts(db);
    expect(told.map((row) => [row.userId, JSON.parse(row.payload).audience])).toEqual([['mod', 'staff'], ['owner', 'team']]);
    const sent: Array<{ chatId: string; text: string; url: string }> = [];
    const sender = {
      async sendMessage(chatId: number | string, text: string, markup?: unknown) {
        sent.push({ chatId: String(chatId), text, url: (markup as { inline_keyboard: Array<Array<{ url: string }>> }).inline_keyboard[0][0].url });
      },
    };
    await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(8) });
    expect(sent.find((message) => message.chatId === '7001')).toMatchObject({ url: 'https://bugunbor.uz/business/deals' });
    expect(sent.find((message) => message.chatId === '7001')!.text).toContain('<b>Osh</b> aksiyasi vaqtincha to‘xtatildi: 3 ta mijoz');
    // The moderator also has the complaint itself.
    const held = sent.find((message) => message.chatId === '7009' && message.text.includes('Avtomatik to‘xtatildi'));
    expect(held).toMatchObject({ url: 'https://bugunbor.uz/admin/reports' });
    expect(held!.text).toContain('Avtomatik to‘xtatildi: <b>Osh</b> (Kafe)');

    // The business sees why and cannot put it back itself.
    const [listed] = await listBusinessDeals(db, 'biz', later(9));
    expect(listed).toMatchObject({ held: true, complaints: 3 });
    expect(await errorCode(transitionDeal(db, { businessId: 'biz', userId: 'owner', dealId: 'deal', action: 'resume' }, later(10)))).toBe('UNDER_REVIEW');

    // Moderators see one line per complaint, counted per deal.
    const reports = await listReports(db, { status: 'NEW' });
    expect(reports).toHaveLength(3);
    expect(reports[0]).toMatchObject({ targetType: 'REDEMPTION', title: 'Osh', link: '/deals/osh', dealId: 'deal', held: true, count: 3 });

    await releaseDealHold(db, { actorId: 'mod', dealId: 'deal' }, later(30));
    expect(await dealState(db)).toEqual({ status: 'ACTIVE', held: 0 });
    expect(await listReports(db, { status: 'NEW' })).toEqual([]);
    expect(await errorCode(releaseDealHold(db, { actorId: 'mod', dealId: 'deal' }, later(31)))).toBe('INVALID_TRANSITION');
    const [after] = await listBusinessDeals(db, 'biz', later(32));
    expect(after).toMatchObject({ held: false, complaints: 0 });
  });

  it('complaints older than a week, or already handled, do not add up', async () => {
    const db = await world();
    const alice = await claim(db, 'alice');
    const bob = await claim(db, 'bob');
    await reportCodeIssue(db, { userId: 'alice', redemptionId: alice.id, issue: 'NOT_AVAILABLE', comment: null }, later(5));
    await reportCodeIssue(db, { userId: 'bob', redemptionId: bob.id, issue: 'NOT_AVAILABLE', comment: null }, later(6));
    // Eight days later a third person: the first two are too old to count.
    await db.prepare(`UPDATE reports SET created_at = ?1`).bind(toDbTime(later(-8 * 24 * 60))).run();
    const stranger = await claim(db, 'stranger', later(10));
    expect(await reportCodeIssue(db, { userId: 'stranger', redemptionId: stranger.id, issue: 'NOT_AVAILABLE', comment: null }, later(12))).toMatchObject({ held: false });
    expect(await dealState(db)).toEqual({ status: 'ACTIVE', held: 0 });
  });
});
