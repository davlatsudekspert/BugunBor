import { mediaUrl } from '@/lib/photos';
import { toDbTime } from '@/lib/time';
import { DomainError } from '@/modules/errors';
import { PUBLIC_BUSINESS_SQL } from '@/modules/deals/status';

// Customers follow businesses to hear about their new deals on Telegram.

export async function followBusiness(db: D1Database, input: { userId: string; businessId: string }, now = new Date()) {
  const business = await db.prepare(`SELECT id FROM businesses b WHERE b.id = ?1 AND ${PUBLIC_BUSINESS_SQL}`).bind(input.businessId).first();
  if (!business) throw new DomainError('NOT_FOUND');
  await db
    .prepare(`INSERT OR IGNORE INTO follows(user_id, business_id, created_at) VALUES (?1, ?2, ?3)`)
    .bind(input.userId, input.businessId, toDbTime(now))
    .run();
}

export async function unfollowBusiness(db: D1Database, input: { userId: string; businessId: string }) {
  await db.prepare(`DELETE FROM follows WHERE user_id = ?1 AND business_id = ?2`).bind(input.userId, input.businessId).run();
}

export async function followState(db: D1Database, businessId: string, userId: string | null) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS followers, SUM(CASE WHEN user_id = ?2 THEN 1 ELSE 0 END) AS mine FROM follows WHERE business_id = ?1`)
    .bind(businessId, userId ?? '')
    .first<{ followers: number; mine: number | null }>();
  return { followers: row?.followers ?? 0, following: Boolean(row?.mine) };
}

export type FollowedBusiness = { id: string; slug: string; name: string; city: string; logo: string | null; liveDeals: number };

export async function listFollowedBusinesses(db: D1Database, userId: string, options: { demo: boolean; now?: Date }): Promise<FollowedBusiness[]> {
  const nowDb = toDbTime(options.now ?? new Date());
  const rows = await db
    .prepare(`SELECT b.id, b.slug, b.name, b.city, b.logo_id AS logoId,
        (SELECT COUNT(*) FROM deals d WHERE d.business_id = b.id AND d.status = 'ACTIVE' AND d.deleted_at IS NULL
          AND d.starts_at <= ?2 AND d.ends_at > ?2 AND (d.remaining_quantity IS NULL OR d.remaining_quantity > 0)) AS liveDeals
      FROM follows f JOIN businesses b ON b.id = f.business_id
      WHERE f.user_id = ?1 AND ${PUBLIC_BUSINESS_SQL} AND (?3 = 1 OR b.is_demo = 0)
      ORDER BY liveDeals DESC, f.created_at DESC`)
    .bind(userId, nowDb, options.demo ? 1 : 0)
    .all<Omit<FollowedBusiness, 'logo'> & { logoId: string | null }>();
  return rows.results.map(({ logoId, ...row }) => ({ ...row, logo: mediaUrl(logoId) }));
}
