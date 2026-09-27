import { addMinutes, parseDbTime, toDbTime } from '@/lib/time';

// Booking and never coming holds a unit back from others. Codes that ran out
// unused count (cancelling one yourself does not, nor does a business
// cancelling it): three in a week and booking pauses for a day, counted from
// the last one. After two, people are warned before they book.

export const NO_SHOW_RULES = { limit: 3, days: 7, pauseHours: 24 } as const;

export type NoShowState = { count: number; pausedUntil: string | null };

export async function noShowState(db: D1Database, userId: string, now = new Date()): Promise<NoShowState> {
  const nowDb = toDbTime(now);
  const rows = await db
    .prepare(`SELECT expires_at AS at FROM redemptions
      WHERE user_id = ?1 AND expires_at >= ?2 AND expires_at <= ?3 AND status IN ('EXPIRED', 'CLAIMED')
      ORDER BY expires_at DESC`)
    .bind(userId, toDbTime(addMinutes(now, -NO_SHOW_RULES.days * 24 * 60)), nowDb)
    .all<{ at: string }>();
  const count = rows.results.length;
  if (count < NO_SHOW_RULES.limit) return { count, pausedUntil: null };
  const until = toDbTime(addMinutes(parseDbTime(rows.results[0].at), NO_SHOW_RULES.pauseHours * 60));
  return { count, pausedUntil: until > nowDb ? until : null };
}
