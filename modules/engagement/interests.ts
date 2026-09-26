import { toDbTime } from '@/lib/time';

// Categories a customer likes: the app's "For you" row and the "new deal near
// you" notification use them. Stored by category id, exchanged as slugs.

export const MAX_INTERESTS = 20;

export async function getInterests(db: D1Database, userId: string): Promise<string[]> {
  const rows = await db
    .prepare(`SELECT c.slug FROM user_interests i JOIN categories c ON c.id = i.category_id WHERE i.user_id = ?1 AND c.is_active = 1 ORDER BY c.sort_order`)
    .bind(userId)
    .all<{ slug: string }>();
  return rows.results.map((row) => row.slug);
}

/** Replaces the user's interests; unknown or inactive slugs are ignored. Returns what was saved. */
export async function setInterests(db: D1Database, userId: string, slugs: string[], now = new Date()) {
  const wanted = [...new Set(slugs)].slice(0, MAX_INTERESTS);
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`DELETE FROM user_interests WHERE user_id = ?1`).bind(userId),
    ...wanted.map((slug) =>
      db.prepare(`INSERT OR IGNORE INTO user_interests(user_id, category_id, created_at) SELECT ?1, id, ?3 FROM categories WHERE slug = ?2 AND is_active = 1`).bind(userId, slug, nowDb),
    ),
  ]);
  return getInterests(db, userId);
}
