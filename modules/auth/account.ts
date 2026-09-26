import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';
import { cancelRedemption } from '@/modules/redemptions/service';
import { revokeAllSessionsStatement } from './sessions';
import { removeAvatarStatement } from './avatar';

export async function updateDisplayName(db: D1Database, userId: string, displayName: string, now = new Date()) {
  await db.prepare(`UPDATE users SET display_name = ?2, updated_at = ?3 WHERE id = ?1`).bind(userId, displayName, toDbTime(now)).run();
}

export type AccountStats = { redeemed: number; savedUzs: number; active: number };

export async function accountStats(db: D1Database, userId: string, now = new Date()): Promise<AccountStats> {
  const row = await db
    .prepare(`SELECT
        SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) AS redeemed,
        SUM(CASE WHEN r.status = 'COMPLETED' AND d.original_price_uzs IS NOT NULL THEN d.original_price_uzs - d.discounted_price_uzs ELSE 0 END) AS savedUzs,
        SUM(CASE WHEN r.status = 'CLAIMED' AND r.expires_at > ?2 THEN 1 ELSE 0 END) AS active
      FROM redemptions r JOIN deals d ON d.id = r.deal_id WHERE r.user_id = ?1`)
    .bind(userId, toDbTime(now))
    .first<{ redeemed: number | null; savedUzs: number | null; active: number | null }>();
  return { redeemed: row?.redeemed ?? 0, savedUzs: row?.savedUzs ?? 0, active: row?.active ?? 0 };
}

/**
 * Deletes an account: personal data is erased, sessions end, active codes are
 * cancelled (their units return to the pool), memberships end, and app data
 * (push devices, interests, blocks, notification area) is removed. Redemption
 * history stays for businesses, now anonymous. The only owner of a business
 * must either add another owner or ask to close the business in the same step.
 */
export async function deleteAccount(db: D1Database, userId: string, now = new Date(), options: { closeBusinesses?: boolean } = {}) {
  const soleOwned = await db
    .prepare(`SELECT m.business_id AS id FROM business_members m JOIN businesses b ON b.id = m.business_id
      WHERE m.user_id = ?1 AND m.role = 'OWNER' AND m.revoked_at IS NULL AND b.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM business_members o
          WHERE o.business_id = m.business_id AND o.role = 'OWNER' AND o.revoked_at IS NULL AND o.user_id != ?1)`)
    .bind(userId)
    .all<{ id: string }>();
  if (soleOwned.results.length && !options.closeBusinesses) throw new DomainError('SOLE_OWNER');

  const nowDb = toDbTime(now);
  const active = await db
    .prepare(`SELECT id FROM redemptions WHERE user_id = ?1 AND status = 'CLAIMED' AND expires_at > ?2`)
    .bind(userId, nowDb)
    .all<{ id: string }>();
  for (const redemption of active.results) {
    await cancelRedemption(db, { redemptionId: redemption.id, userId, now }).catch(() => undefined);
  }

  await db.batch([
    // Businesses only this person owned close with the account: off the site, deals archived, open codes cancelled.
    ...soleOwned.results.flatMap(({ id }) => [
      db.prepare(`UPDATE businesses SET deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND deleted_at IS NULL`).bind(id, nowDb),
      db.prepare(`UPDATE deals SET status = 'ARCHIVED', updated_at = ?2 WHERE business_id = ?1 AND status NOT IN ('ARCHIVED', 'REJECTED')`).bind(id, nowDb),
      db.prepare(`UPDATE redemptions SET status = 'CANCELED', canceled_at = ?2, updated_at = ?2 WHERE business_id = ?1 AND status = 'CLAIMED'`).bind(id, nowDb),
      db.prepare(`UPDATE business_members SET revoked_at = ?2 WHERE business_id = ?1 AND revoked_at IS NULL`).bind(id, nowDb),
      auditStatement(db, { actorUserId: userId, businessId: id, action: 'business.closed', targetType: 'Business', targetId: id, reason: 'Owner deleted the account' }, nowDb),
    ]),
    db.prepare(`UPDATE users SET status = 'DELETED', phone = NULL, email = NULL, telegram_user_id = NULL, telegram_username = NULL,
        display_name = 'Deleted user', notify_nearby = 0, notify_lat_e2 = NULL, notify_lng_e2 = NULL, notify_city = NULL, notify_area_at = NULL,
        deleted_at = ?2, updated_at = ?2 WHERE id = ?1`).bind(userId, nowDb),
    revokeAllSessionsStatement(db, userId, nowDb),
    db.prepare(`DELETE FROM favorites WHERE user_id = ?1`).bind(userId),
    db.prepare(`DELETE FROM follows WHERE user_id = ?1`).bind(userId),
    db.prepare(`DELETE FROM notifications WHERE user_id = ?1`).bind(userId),
    db.prepare(`DELETE FROM devices WHERE user_id = ?1`).bind(userId),
    db.prepare(`DELETE FROM user_interests WHERE user_id = ?1`).bind(userId),
    db.prepare(`DELETE FROM user_blocks WHERE user_id = ?1`).bind(userId),
    removeAvatarStatement(db, userId),
    // Ratings stay (they describe real visits) but the comment text is personal data.
    db.prepare(`UPDATE reviews SET comment = NULL, updated_at = ?2 WHERE user_id = ?1`).bind(userId, nowDb),
    db.prepare(`UPDATE business_members SET revoked_at = ?2 WHERE user_id = ?1 AND revoked_at IS NULL`).bind(userId, nowDb),
    auditStatement(db, { actorUserId: userId, action: 'user.deleted', targetType: 'User', targetId: userId }, nowDb),
  ]);
}

export async function soleOwnedBusinesses(db: D1Database, userId: string) {
  const rows = await db
    .prepare(`SELECT b.name FROM business_members m JOIN businesses b ON b.id = m.business_id
      WHERE m.user_id = ?1 AND m.role = 'OWNER' AND m.revoked_at IS NULL AND b.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM business_members o WHERE o.business_id = m.business_id AND o.role = 'OWNER' AND o.revoked_at IS NULL AND o.user_id != ?1)`)
    .bind(userId)
    .all<{ name: string }>();
  return rows.results.map((row) => row.name);
}

export type NotificationSettings = { notifyDeals: boolean; notifyReminders: boolean; notifyNearby: boolean };

export async function getNotificationSettings(db: D1Database, userId: string): Promise<NotificationSettings> {
  const row = await db
    .prepare(`SELECT notify_deals AS notifyDeals, notify_reminders AS notifyReminders, notify_nearby AS notifyNearby FROM users WHERE id = ?1`)
    .bind(userId)
    .first<{ notifyDeals: number; notifyReminders: number; notifyNearby: number }>();
  return { notifyDeals: Boolean(row?.notifyDeals ?? 1), notifyReminders: Boolean(row?.notifyReminders ?? 1), notifyNearby: Boolean(row?.notifyNearby ?? 0) };
}

/** "New deal near you" alerts; switching them off forgets the notification area at once. */
export async function setNotifyNearby(db: D1Database, userId: string, on: boolean) {
  await db
    .prepare(`UPDATE users SET notify_nearby = ?2,
        notify_lat_e2 = CASE WHEN ?2 = 1 THEN notify_lat_e2 END, notify_lng_e2 = CASE WHEN ?2 = 1 THEN notify_lng_e2 END,
        notify_city = CASE WHEN ?2 = 1 THEN notify_city END, notify_area_at = CASE WHEN ?2 = 1 THEN notify_area_at END
      WHERE id = ?1`)
    .bind(userId, on ? 1 : 0)
    .run();
  if (!on) await db.prepare(`UPDATE notifications SET status = 'SKIPPED' WHERE user_id = ?1 AND kind = 'INTEREST_DEAL' AND status = 'PENDING'`).bind(userId).run();
}

export async function setUserLocale(db: D1Database, userId: string, locale: 'uz' | 'ru') {
  await db.prepare(`UPDATE users SET locale = ?2 WHERE id = ?1`).bind(userId, locale).run();
}

export async function updateNotificationSettings(db: D1Database, userId: string, settings: Partial<NotificationSettings>) {
  await db
    .prepare(`UPDATE users SET notify_deals = COALESCE(?2, notify_deals), notify_reminders = COALESCE(?3, notify_reminders) WHERE id = ?1`)
    .bind(userId, settings.notifyDeals === undefined ? null : Number(settings.notifyDeals), settings.notifyReminders === undefined ? null : Number(settings.notifyReminders))
    .run();
  // Turning a kind off also drops what is already queued for it.
  const kinds = [settings.notifyDeals === false ? 'NEW_DEAL' : null, settings.notifyReminders === false ? 'CODE_REMINDER' : null].filter(Boolean);
  for (const kind of kinds) {
    await db.prepare(`UPDATE notifications SET status = 'SKIPPED' WHERE user_id = ?1 AND kind = ?2 AND status = 'PENDING'`).bind(userId, kind).run();
  }
}
