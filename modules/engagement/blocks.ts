import { toDbTime } from '@/lib/time';
import { DomainError } from '@/modules/errors';

// A customer can block a business: its deals disappear from their feed and
// notifications, and the follow (if any) ends.

export async function listBlockedBusinessIds(db: D1Database, userId: string): Promise<string[]> {
  const rows = await db.prepare(`SELECT business_id AS id FROM user_blocks WHERE user_id = ?1 ORDER BY created_at`).bind(userId).all<{ id: string }>();
  return rows.results.map((row) => row.id);
}

export async function blockBusiness(db: D1Database, input: { userId: string; businessId: string }, now = new Date()) {
  const exists = await db.prepare(`SELECT 1 FROM businesses WHERE id = ?1 AND deleted_at IS NULL`).bind(input.businessId).first();
  if (!exists) throw new DomainError('NOT_FOUND');
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO user_blocks(user_id, business_id, created_at) VALUES (?1, ?2, ?3)`).bind(input.userId, input.businessId, toDbTime(now)),
    db.prepare(`DELETE FROM follows WHERE user_id = ?1 AND business_id = ?2`).bind(input.userId, input.businessId),
  ]);
}

export async function unblockBusiness(db: D1Database, input: { userId: string; businessId: string }) {
  await db.prepare(`DELETE FROM user_blocks WHERE user_id = ?1 AND business_id = ?2`).bind(input.userId, input.businessId).run();
}
