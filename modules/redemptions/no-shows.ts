import { addMinutes, parseDbTime, toDbTime } from '@/lib/time';

// Booking and never coming holds a unit back from others. Codes that ran out
// unused count (cancelling one yourself does not, nor does a business
// cancelling it): three in a week and booking pauses for a day, counted from
// the last one. After two, people are warned before they book. A code the
// person complained about (nothing left, code refused, branch closed) does
// not count unless a moderator dismissed the complaint.

export const NO_SHOW_RULES = { limit: 3, days: 7, pauseHours: 24 } as const;

export type NoShowState = { count: number; pausedUntil: string | null };

export async function noShowState(db: D1Database, userId: string, now = new Date()): Promise<NoShowState> {
  const nowDb = toDbTime(now);
  const rows = await db
    .prepare(`SELECT expires_at AS at FROM redemptions
      WHERE user_id = ?1 AND expires_at >= ?2 AND expires_at <= ?3 AND status IN ('EXPIRED', 'CLAIMED')
        AND NOT EXISTS (SELECT 1 FROM reports p WHERE p.target_type = 'REDEMPTION' AND p.target_id = redemptions.id
          AND p.reporter_id = ?1 AND p.reason IN ('NOT_AVAILABLE', 'CODE_REFUSED', 'BRANCH_CLOSED') AND p.status != 'DISMISSED')
      ORDER BY expires_at DESC`)
    .bind(userId, toDbTime(addMinutes(now, -NO_SHOW_RULES.days * 24 * 60)), nowDb)
    .all<{ at: string }>();
  const count = rows.results.length;
  if (count < NO_SHOW_RULES.limit) return { count, pausedUntil: null };
  const until = toDbTime(addMinutes(parseDbTime(rows.results[0].at), NO_SHOW_RULES.pauseHours * 60));
  return { count, pausedUntil: until > nowDb ? until : null };
}
