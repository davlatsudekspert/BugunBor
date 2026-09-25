import { describe, expect, it } from 'vitest';

import { toDbTime } from '@/lib/time';
import { NOW, SECRET, marketplace } from '@/test/fixtures';
import { decideDeal } from '@/modules/moderation/service';
import { processNotifications } from '@/modules/notifications/service';
import { claimDeal, completeRedemption } from '@/modules/redemptions/service';
import { followBusiness, followState, listFollowedBusinesses, unfollowBusiness } from './follows';
import { createReview, listBusinessReviews, reviewerName, setReviewHidden } from './reviews';

const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string; message?: string }) => error.code ?? error.message ?? 'UNKNOWN');
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

async function world() {
  const db = await marketplace();
  await db.batch([
    db.prepare(`UPDATE users SET telegram_user_id = '1001' WHERE id = 'alice'`),
    db.prepare(`UPDATE users SET telegram_user_id = '1002', notify_deals = 0 WHERE id = 'bob'`),
    db.prepare(`UPDATE users SET telegram_user_id = '1003' WHERE id = 'owner'`),
    db.prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs,
        discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id, claim_ttl_minutes, search_text)
      VALUES ('deal2', 'biz', 'cat_food', 'somsa', 'Somsa <3', 'Issiq somsa', 'Zalda', 20000, 14000, 30, ?1, ?2, 10, 10, 1, 'ONSITE_CODE', 'PENDING_REVIEW', 'owner', 30, 'somsa')`)
      .bind(toDbTime(later(-10)), toDbTime(later(300))),
  ]);
  return db;
}

type Sent = { chatId: string; text: string; url: string };

function fakeSender(fail?: (chatId: string) => string | null) {
  const sent: Sent[] = [];
  return {
    sent,
    sender: {
      async sendMessage(chatId: number | string, text: string, markup?: unknown) {
        const error = fail?.(String(chatId));
        if (error) throw new Error(error);
        const url = (markup as { inline_keyboard: Array<Array<{ url: string }>> }).inline_keyboard[0][0].url;
        sent.push({ chatId: String(chatId), text, url });
      },
    },
  };
}

const pending = async (db: D1Database) =>
  (await db.prepare(`SELECT user_id AS userId, kind, status, send_after AS sendAfter FROM notifications ORDER BY kind, user_id`).all<{ userId: string; kind: string; status: string; sendAfter: string }>()).results;

describe('follows', () => {
  it('follows only public businesses and reports the count', async () => {
    const db = await world();
    await followBusiness(db, { userId: 'alice', businessId: 'biz' }, NOW);
    await followBusiness(db, { userId: 'alice', businessId: 'biz' }, NOW);
    await followBusiness(db, { userId: 'bob', businessId: 'biz' }, NOW);
    expect(await followState(db, 'biz', 'alice')).toEqual({ followers: 2, following: true });
    expect(await followState(db, 'biz', 'stranger')).toEqual({ followers: 2, following: false });
    await db.prepare(`UPDATE businesses SET verification_status = 'PENDING' WHERE id = 'other'`).run();
    expect(await errorCode(followBusiness(db, { userId: 'alice', businessId: 'other' }, NOW))).toBe('NOT_FOUND');
    const followed = await listFollowedBusinesses(db, 'alice', { demo: true, now: NOW });
    expect(followed.map((business) => [business.id, business.liveDeals])).toEqual([['biz', 1]]);
    await unfollowBusiness(db, { userId: 'alice', businessId: 'biz' });
    expect(await followState(db, 'biz', 'alice')).toEqual({ followers: 1, following: false });
  });
});

describe('notifications', () => {
  it('tells followers about an approved deal when it starts, and the team about the decision', async () => {
    const db = await world();
    await followBusiness(db, { userId: 'alice', businessId: 'biz' }, NOW);
    await followBusiness(db, { userId: 'bob', businessId: 'biz' }, NOW);
    await decideDeal(db, { actorId: 'mod', dealId: 'deal2', decision: 'APPROVE', reason: '' }, NOW);
    expect(await pending(db)).toEqual([
      { userId: 'owner', kind: 'DEAL_APPROVED', status: 'PENDING', sendAfter: toDbTime(NOW) },
      // Bob turned deal alerts off.
      { userId: 'alice', kind: 'NEW_DEAL', status: 'PENDING', sendAfter: toDbTime(NOW) },
    ]);

    const { sender, sent } = fakeSender();
    expect(await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: NOW })).toEqual({ sent: 2, skipped: 0, failed: 0 });
    const alert = sent.find((message) => message.chatId === '1001')!;
    expect(alert.text).toContain('Somsa &lt;3');
    expect(alert.text).toContain('14');
    expect(alert.url).toBe('https://bugunbor.uz/deals/somsa');
    // Nothing is sent twice.
    expect(await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(5) })).toEqual({ sent: 0, skipped: 0, failed: 0 });
  });

  it('reminds before a code expires, thanks after it is used, and skips stale reminders', async () => {
    const db = await world();
    const claim = await claimDeal(db, { dealId: 'deal', branchId: 'br1', userId: 'alice', idempotencyKey: 'key-alice-0001', secret: SECRET, now: NOW });
    expect(await pending(db)).toEqual([{ userId: 'alice', kind: 'CODE_REMINDER', status: 'PENDING', sendAfter: toDbTime(later(30)) }]);

    const { sender, sent } = fakeSender();
    expect(await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(10) })).toEqual({ sent: 0, skipped: 0, failed: 0 });
    await completeRedemption(db, { businessId: 'biz', redemptionId: claim.id, staffUserId: 'cashier', now: later(20) });
    const summary = await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(31) });
    expect(summary).toEqual({ sent: 1, skipped: 1, failed: 0 });
    expect(sent[0].text).toContain('20');
    expect(sent[0].url).toBe(`https://bugunbor.uz/account/codes#review-${claim.id}`);
  });

  it('retries temporary failures and gives up on blocked bots', async () => {
    const db = await world();
    await db.prepare(`UPDATE users SET notify_deals = 1 WHERE id = 'bob'`).run();
    await followBusiness(db, { userId: 'alice', businessId: 'biz' }, NOW);
    await followBusiness(db, { userId: 'bob', businessId: 'biz' }, NOW);
    await decideDeal(db, { actorId: 'mod', dealId: 'deal2', decision: 'APPROVE', reason: '' }, NOW);
    const { sender } = fakeSender((chatId) => (chatId === '1001' ? 'Forbidden: bot was blocked by the user' : chatId === '1002' ? 'Too Many Requests' : null));
    expect(await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: NOW })).toEqual({ sent: 1, skipped: 0, failed: 1 });
    const rows = await pending(db);
    expect(rows.find((row) => row.userId === 'alice')?.status).toBe('SKIPPED');
    expect(rows.find((row) => row.userId === 'bob')).toMatchObject({ status: 'PENDING', sendAfter: toDbTime(later(5)) });
  });
});

describe('reviews', () => {
  it('only rates real visits, once, and keeps the business rating in sync', async () => {
    const db = await world();
    const claim = await claimDeal(db, { dealId: 'deal', branchId: 'br1', userId: 'alice', idempotencyKey: 'key-alice-0002', secret: SECRET, now: NOW });
    expect(await errorCode(createReview(db, { userId: 'alice', redemptionId: claim.id, rating: 5, comment: null }, NOW))).toBe('REVIEW_NOT_ALLOWED');
    await completeRedemption(db, { businessId: 'biz', redemptionId: claim.id, staffUserId: 'cashier', now: later(5) });
    expect(await errorCode(createReview(db, { userId: 'bob', redemptionId: claim.id, rating: 5, comment: null }, later(10)))).toBe('NOT_FOUND');
    const review = await createReview(db, { userId: 'alice', redemptionId: claim.id, rating: 4, comment: '  Osh juda mazali!  ' }, later(10));
    expect(await errorCode(createReview(db, { userId: 'alice', redemptionId: claim.id, rating: 1, comment: null }, later(11)))).toBe('ALREADY_REVIEWED');
    expect(await db.prepare(`SELECT rating_basis_points AS rating, review_count AS count FROM businesses WHERE id = 'biz'`).first()).toEqual({ rating: 400, count: 1 });
    expect(await listBusinessReviews(db, 'biz')).toMatchObject([{ rating: 4, comment: 'Osh juda mazali!', author: 'Alice K.', dealTitle: 'Osh' }]);

    await setReviewHidden(db, { actorId: 'mod', reviewId: review.id, hidden: true, reason: 'Spam' }, later(20));
    expect(await db.prepare(`SELECT rating_basis_points AS rating, review_count AS count FROM businesses WHERE id = 'biz'`).first()).toEqual({ rating: 0, count: 0 });
    expect(await listBusinessReviews(db, 'biz')).toEqual([]);
  });

  it('closes the rating window after 30 days', async () => {
    const db = await world();
    const claim = await claimDeal(db, { dealId: 'deal', branchId: 'br1', userId: 'alice', idempotencyKey: 'key-alice-0003', secret: SECRET, now: NOW });
    await completeRedemption(db, { businessId: 'biz', redemptionId: claim.id, staffUserId: 'cashier', now: later(5) });
    expect(await errorCode(createReview(db, { userId: 'alice', redemptionId: claim.id, rating: 5, comment: null }, later(31 * 24 * 60)))).toBe('REVIEW_NOT_ALLOWED');
  });

  it('masks reviewer names', () => {
    expect(reviewerName('Aziza Karimova')).toBe('Aziza K.');
    expect(reviewerName('Jasur')).toBe('Jasur');
    expect(reviewerName('  ')).toBeNull();
  });
});
