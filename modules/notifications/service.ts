import { formatNumber } from '@/lib/format';
import { fmt, getDictionary, isLocale, type Dictionary } from '@/lib/i18n';
import { formatClock, formatNumericDate, isSameTashkentDay, parseDbTime, toDbTime } from '@/lib/time';
import type { BotSender } from '@/modules/telegram/api';

// Telegram notifications go through an outbox table: domain code only adds
// rows (inside its own transaction, deduplicated by key), and a background
// job sends them later. A failed send never breaks a claim or a decision.

export type NotificationKind = 'NEW_DEAL' | 'CODE_REMINDER' | 'REDEEMED' | 'DEAL_APPROVED' | 'DEAL_REJECTED' | 'BUSINESS_APPROVED' | 'BUSINESS_REJECTED';

const RETRY_LIMIT = 3;
const REMINDER_BEFORE_MINUTES = 30;

/** New deal from a followed business, for every follower who wants deal alerts. */
export function followersNewDealStatement(db: D1Database, input: { dealId: string; sendAfter: string; nowDb: string }) {
  return db
    .prepare(`INSERT OR IGNORE INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at)
      SELECT lower(hex(randomblob(16))), f.user_id, 'NEW_DEAL', 'NEW_DEAL:' || ?1 || ':' || f.user_id, json_object('dealId', ?1), ?2, ?3
      FROM follows f JOIN deals d ON d.business_id = f.business_id JOIN users u ON u.id = f.user_id
      WHERE d.id = ?1 AND d.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.notify_deals = 1 AND u.telegram_user_id IS NOT NULL`)
    .bind(input.dealId, input.sendAfter, input.nowDb);
}

/** Reminder half an hour before a claimed code expires. Only inserts if the claim exists. */
export function codeReminderStatement(db: D1Database, input: { redemptionId: string; nowDb: string }) {
  return db
    .prepare(`INSERT OR IGNORE INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at)
      SELECT lower(hex(randomblob(16))), r.user_id, 'CODE_REMINDER', 'CODE_REMINDER:' || r.id, json_object('redemptionId', r.id),
        strftime('%Y-%m-%d %H:%M:%S', r.expires_at, '-${REMINDER_BEFORE_MINUTES} minutes'), ?2
      FROM redemptions r JOIN users u ON u.id = r.user_id
      WHERE r.id = ?1 AND r.status = 'CLAIMED' AND u.notify_reminders = 1 AND u.telegram_user_id IS NOT NULL
        AND (julianday(r.expires_at) - julianday(r.created_at)) * 1440 >= 60`)
    .bind(input.redemptionId, input.nowDb);
}

/** Thank-you with the amount saved and a link to rate the visit. Only inserts once the code is used. */
export function redeemedStatement(db: D1Database, input: { redemptionId: string; nowDb: string }) {
  return db
    .prepare(`INSERT OR IGNORE INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at)
      SELECT lower(hex(randomblob(16))), r.user_id, 'REDEEMED', 'REDEEMED:' || r.id, json_object('redemptionId', r.id), ?2, ?2
      FROM redemptions r JOIN users u ON u.id = r.user_id
      WHERE r.id = ?1 AND r.status = 'COMPLETED' AND u.telegram_user_id IS NOT NULL`)
    .bind(input.redemptionId, input.nowDb);
}

/** Moderation outcome for the owners and managers of a business. */
export function teamStatement(db: D1Database, input: { businessId: string; kind: NotificationKind; key: string; payload: Record<string, string>; nowDb: string }) {
  return db
    .prepare(`INSERT OR IGNORE INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at)
      SELECT lower(hex(randomblob(16))), m.user_id, ?2, ?2 || ':' || ?3 || ':' || m.user_id, ?4, ?5, ?5
      FROM business_members m JOIN users u ON u.id = m.user_id
      WHERE m.business_id = ?1 AND m.revoked_at IS NULL AND m.role IN ('OWNER', 'MANAGER')
        AND u.status = 'ACTIVE' AND u.telegram_user_id IS NOT NULL`)
    .bind(input.businessId, input.kind, input.key, JSON.stringify(input.payload), input.nowDb);
}

type Rendered = { text: string; button: string; path: string };
type Row = { id: string; userId: string; kind: NotificationKind; payload: string; attempts: number };

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function until(value: string, now: Date) {
  const date = parseDbTime(value);
  return isSameTashkentDay(date, now) ? formatClock(date) : `${formatNumericDate(date)} ${formatClock(date)}`;
}

async function render(db: D1Database, row: Row, t: Dictionary, now: Date): Promise<Rendered | null> {
  const payload = JSON.parse(row.payload) as Record<string, string>;
  const n = t.notify;
  const nowDb = toDbTime(now);
  switch (row.kind) {
    case 'NEW_DEAL': {
      const deal = await db
        .prepare(`SELECT d.slug, d.title, d.discounted_price_uzs AS price, d.discount_percent AS percent, d.ends_at AS endsAt, b.name AS business
          FROM deals d JOIN businesses b ON b.id = d.business_id
          WHERE d.id = ?1 AND d.status = 'ACTIVE' AND d.deleted_at IS NULL AND d.ends_at > ?2 AND (d.remaining_quantity IS NULL OR d.remaining_quantity > 0)`)
        .bind(payload.dealId, nowDb)
        .first<{ slug: string; title: string; price: number; percent: number; endsAt: string; business: string }>();
      if (!deal) return null;
      return {
        text: fmt(n.newDeal, { business: escapeHtml(deal.business), title: escapeHtml(deal.title), price: formatNumber(deal.price), percent: deal.percent, until: until(deal.endsAt, now) }),
        button: n.newDealButton,
        path: `/deals/${deal.slug}`,
      };
    }
    case 'CODE_REMINDER': {
      const code = await db
        .prepare(`SELECT d.title, br.name AS branch, br.address FROM redemptions r JOIN deals d ON d.id = r.deal_id JOIN branches br ON br.id = r.branch_id
          WHERE r.id = ?1 AND r.status = 'CLAIMED' AND r.expires_at > ?2`)
        .bind(payload.redemptionId, nowDb)
        .first<{ title: string; branch: string; address: string }>();
      if (!code) return null;
      return { text: fmt(n.reminder, { title: escapeHtml(code.title), branch: escapeHtml(code.branch), address: escapeHtml(code.address) }), button: n.reminderButton, path: '/account/codes' };
    }
    case 'REDEEMED': {
      const visit = await db
        .prepare(`SELECT d.title, b.name AS business, d.original_price_uzs AS original, d.discounted_price_uzs AS price
          FROM redemptions r JOIN deals d ON d.id = r.deal_id JOIN businesses b ON b.id = r.business_id WHERE r.id = ?1 AND r.status = 'COMPLETED'`)
        .bind(payload.redemptionId)
        .first<{ title: string; business: string; original: number | null; price: number }>();
      if (!visit) return null;
      const saved = visit.original ? visit.original - visit.price : 0;
      const values = { title: escapeHtml(visit.title), business: escapeHtml(visit.business), saved: formatNumber(saved) };
      return { text: fmt(saved > 0 ? n.redeemed : n.redeemedNoSaving, values), button: n.redeemedButton, path: `/account/codes#review-${payload.redemptionId}` };
    }
    case 'DEAL_APPROVED':
    case 'DEAL_REJECTED': {
      const deal = await db.prepare(`SELECT id, slug, title FROM deals WHERE id = ?1 AND deleted_at IS NULL`).bind(payload.dealId).first<{ id: string; slug: string; title: string }>();
      if (!deal) return null;
      return row.kind === 'DEAL_APPROVED'
        ? { text: fmt(n.dealApproved, { title: escapeHtml(deal.title) }), button: n.dealApprovedButton, path: `/deals/${deal.slug}` }
        : { text: fmt(n.dealRejected, { title: escapeHtml(deal.title), reason: escapeHtml(payload.reason ?? '') }), button: n.dealRejectedButton, path: `/business/deals/${deal.id}` };
    }
    case 'BUSINESS_APPROVED':
    case 'BUSINESS_REJECTED': {
      const business = await db.prepare(`SELECT id, name FROM businesses WHERE id = ?1 AND deleted_at IS NULL`).bind(payload.businessId).first<{ id: string; name: string }>();
      if (!business) return null;
      const text = row.kind === 'BUSINESS_APPROVED'
        ? fmt(n.businessApproved, { business: escapeHtml(business.name) })
        : fmt(n.businessRejected, { business: escapeHtml(business.name), reason: escapeHtml(payload.reason ?? '') });
      return { text, button: n.businessButton, path: `/business/switch/${business.id}?next=${encodeURIComponent('/business/dashboard')}` };
    }
    default:
      return null;
  }
}

/** Telegram errors that will never succeed on retry. */
const permanentError = (message: string) => /blocked by the user|chat not found|user is deactivated|bot can't initiate/i.test(message);

/**
 * Sends due notifications. Rows are claimed atomically (status SENDING), so
 * two isolates never send the same message; stuck claims are retried later.
 */
export async function processNotifications(db: D1Database, sender: Pick<BotSender, 'sendMessage'>, options: { appUrl: string; now?: Date; limit?: number }) {
  const now = options.now ?? new Date();
  const nowDb = toDbTime(now);
  const stale = toDbTime(new Date(now.getTime() - 10 * 60_000));
  await db.batch([
    db.prepare(`UPDATE notifications SET status = CASE WHEN attempts >= ?2 THEN 'FAILED' ELSE 'PENDING' END WHERE status = 'SENDING' AND claimed_at < ?1`).bind(stale, RETRY_LIMIT),
    db.prepare(`DELETE FROM notifications WHERE created_at < ?1`).bind(toDbTime(new Date(now.getTime() - 14 * 24 * 60 * 60_000))),
  ]);
  const claimed = await db
    .prepare(`UPDATE notifications SET status = 'SENDING', claimed_at = ?1, attempts = attempts + 1
      WHERE id IN (SELECT id FROM notifications WHERE status = 'PENDING' AND send_after <= ?1 ORDER BY send_after LIMIT ?2)
      RETURNING id, user_id AS userId, kind, payload_json AS payload, attempts`)
    .bind(nowDb, options.limit ?? 20)
    .all<Row>();

  const summary = { sent: 0, skipped: 0, failed: 0 };
  for (const row of claimed.results) {
    const finish = (status: 'SENT' | 'SKIPPED' | 'PENDING' | 'FAILED', error: string | null = null, retryAt: string | null = null) =>
      db.prepare(`UPDATE notifications SET status = ?2, sent_at = CASE WHEN ?2 = 'SENT' THEN ?3 ELSE sent_at END, last_error = ?4,
          send_after = COALESCE(?5, send_after) WHERE id = ?1`)
        .bind(row.id, status, nowDb, error, retryAt)
        .run();
    const user = await db
      .prepare(`SELECT telegram_user_id AS chatId, locale, status FROM users WHERE id = ?1`)
      .bind(row.userId)
      .first<{ chatId: string | null; locale: string; status: string }>();
    if (!user?.chatId || user.status !== 'ACTIVE') {
      await finish('SKIPPED');
      summary.skipped += 1;
      continue;
    }
    const t = getDictionary(isLocale(user.locale) ? user.locale : 'uz');
    let message: Rendered | null;
    try {
      message = await render(db, row, t, now);
    } catch (error) {
      message = null;
      console.error('Notification render failed', row.id, error);
    }
    if (!message) {
      await finish('SKIPPED');
      summary.skipped += 1;
      continue;
    }
    try {
      await sender.sendMessage(user.chatId, `${message.text}\n\n<i>${t.notify.footer}</i>`, {
        inline_keyboard: [[{ text: message.button, url: `${options.appUrl}${message.path}` }]],
      });
      await finish('SENT');
      summary.sent += 1;
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      if (permanentError(text) || row.attempts >= RETRY_LIMIT) {
        await finish(permanentError(text) ? 'SKIPPED' : 'FAILED', text.slice(0, 300));
        summary.failed += 1;
      } else {
        await finish('PENDING', text.slice(0, 300), toDbTime(new Date(now.getTime() + row.attempts * 5 * 60_000)));
      }
    }
  }
  return summary;
}

export async function notificationStats(db: D1Database) {
  const rows = await db.prepare(`SELECT status, COUNT(*) AS n FROM notifications GROUP BY status`).all<{ status: string; n: number }>();
  const stats: Record<string, number> = { PENDING: 0, SENDING: 0, SENT: 0, SKIPPED: 0, FAILED: 0 };
  for (const row of rows.results) stats[row.status] = row.n;
  return stats;
}
