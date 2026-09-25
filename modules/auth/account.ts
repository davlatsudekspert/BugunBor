import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';
import { cancelRedemption } from '@/modules/redemptions/service';
import { revokeAllSessionsStatement } from './sessions';

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
 * Deletes a customer account: personal data is erased, sessions end, active
 * codes are cancelled (their units return to the pool) and memberships end.
 * Redemption history stays for businesses, now anonymous.
 */
export async function deleteAccount(db: D1Database, userId: string, now = new Date()) {
  const soleOwner = await db
    .prepare(`SELECT m.business_id FROM business_members m JOIN businesses b ON b.id = m.business_id
      WHERE m.user_id = ?1 AND m.role = 'OWNER' AND m.revoked_at IS NULL AND b.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM business_members o
          WHERE o.business_id = m.business_id AND o.role = 'OWNER' AND o.revoked_at IS NULL AND o.user_id != ?1)
      LIMIT 1`)
    .bind(userId)
    .first();
  if (soleOwner) throw new DomainError('SOLE_OWNER');

  const nowDb = toDbTime(now);
  const active = await db
    .prepare(`SELECT id FROM redemptions WHERE user_id = ?1 AND status = 'CLAIMED' AND expires_at > ?2`)
    .bind(userId, nowDb)
    .all<{ id: string }>();
  for (const redemption of active.results) {
    await cancelRedemption(db, { redemptionId: redemption.id, userId, now }).catch(() => undefined);
  }

  await db.batch([
    db.prepare(`UPDATE users SET status = 'DELETED', phone = NULL, email = NULL, telegram_user_id = NULL, telegram_username = NULL,
        display_name = 'Deleted user', deleted_at = ?2, updated_at = ?2 WHERE id = ?1`).bind(userId, nowDb),
    revokeAllSessionsStatement(db, userId, nowDb),
    db.prepare(`DELETE FROM favorites WHERE user_id = ?1`).bind(userId),
    db.prepare(`UPDATE business_members SET revoked_at = ?2 WHERE user_id = ?1 AND revoked_at IS NULL`).bind(userId, nowDb),
    auditStatement(db, { actorUserId: userId, action: 'user.deleted', targetType: 'User', targetId: userId }, nowDb),
  ]);
}
