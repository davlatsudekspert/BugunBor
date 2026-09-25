import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';

// Only customers whose code was actually redeemed can rate the business,
// once per redemption and within a month, so ratings reflect real visits.

export const REVIEW_RULES = { windowDays: 30, maxComment: 500 } as const;

function recomputeRating(db: D1Database, businessId: string) {
  return db
    .prepare(`UPDATE businesses SET
        review_count = (SELECT COUNT(*) FROM reviews WHERE business_id = ?1 AND status = 'VISIBLE'),
        rating_basis_points = COALESCE((SELECT CAST(ROUND(AVG(rating) * 100) AS INTEGER) FROM reviews WHERE business_id = ?1 AND status = 'VISIBLE'), 0)
      WHERE id = ?1`)
    .bind(businessId);
}

export async function createReview(db: D1Database, input: { userId: string; redemptionId: string; rating: number; comment: string | null }, now = new Date()) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new DomainError('VALIDATION');
  const comment = input.comment?.trim().slice(0, REVIEW_RULES.maxComment) || null;
  const redemption = await db
    .prepare(`SELECT id, business_id AS businessId, deal_id AS dealId, status, completed_at AS completedAt FROM redemptions WHERE id = ?1 AND user_id = ?2`)
    .bind(input.redemptionId, input.userId)
    .first<{ id: string; businessId: string; dealId: string; status: string; completedAt: string | null }>();
  if (!redemption) throw new DomainError('NOT_FOUND');
  if (redemption.status !== 'COMPLETED' || !redemption.completedAt) throw new DomainError('REVIEW_NOT_ALLOWED');
  const windowStart = toDbTime(new Date(now.getTime() - REVIEW_RULES.windowDays * 24 * 60 * 60_000));
  if (redemption.completedAt < windowStart) throw new DomainError('REVIEW_NOT_ALLOWED');

  const id = crypto.randomUUID();
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO reviews(id, redemption_id, business_id, deal_id, user_id, rating, comment, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)`)
      .bind(id, redemption.id, redemption.businessId, redemption.dealId, input.userId, input.rating, comment, nowDb),
    recomputeRating(db, redemption.businessId),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('ALREADY_REVIEWED');
  return { id };
}

/** Moderators hide abusive reviews (or show them again); ratings follow. */
export async function setReviewHidden(db: D1Database, input: { actorId: string; reviewId: string; hidden: boolean; reason: string }, now = new Date()) {
  const review = await db.prepare(`SELECT business_id AS businessId FROM reviews WHERE id = ?1`).bind(input.reviewId).first<{ businessId: string }>();
  if (!review) throw new DomainError('NOT_FOUND');
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE reviews SET status = ?2, hidden_reason = ?3, updated_at = ?4 WHERE id = ?1`)
      .bind(input.reviewId, input.hidden ? 'HIDDEN' : 'VISIBLE', input.hidden ? input.reason.trim() || null : null, nowDb),
    recomputeRating(db, review.businessId),
    auditStatement(db, { actorUserId: input.actorId, businessId: review.businessId, action: input.hidden ? 'review.hidden' : 'review.shown', targetType: 'Review', targetId: input.reviewId, reason: input.reason.trim() || null }, nowDb),
  ]);
}

/** "Aziza Karimova" → "Aziza K." so reviews never expose full names. */
export function reviewerName(displayName: string | null) {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

export type PublicReview = { id: string; rating: number; comment: string | null; createdAt: string; author: string | null; dealTitle: string };

export async function listBusinessReviews(db: D1Database, businessId: string, limit = 10): Promise<PublicReview[]> {
  const rows = await db
    .prepare(`SELECT r.id, r.rating, r.comment, r.created_at AS createdAt, u.display_name AS displayName, d.title AS dealTitle
      FROM reviews r JOIN users u ON u.id = r.user_id JOIN deals d ON d.id = r.deal_id
      WHERE r.business_id = ?1 AND r.status = 'VISIBLE'
      ORDER BY (r.comment IS NULL), r.created_at DESC LIMIT ?2`)
    .bind(businessId, limit)
    .all<Omit<PublicReview, 'author'> & { displayName: string | null }>();
  return rows.results.map(({ displayName, ...row }) => ({ ...row, author: reviewerName(displayName) }));
}

/** Redemptions of this user that can still be rated, keyed by redemption id. */
export async function reviewableRedemptions(db: D1Database, userId: string, now = new Date()) {
  const windowStart = toDbTime(new Date(now.getTime() - REVIEW_RULES.windowDays * 24 * 60 * 60_000));
  const rows = await db
    .prepare(`SELECT r.id FROM redemptions r
      WHERE r.user_id = ?1 AND r.status = 'COMPLETED' AND r.completed_at >= ?2
        AND NOT EXISTS (SELECT 1 FROM reviews v WHERE v.redemption_id = r.id)`)
    .bind(userId, windowStart)
    .all<{ id: string }>();
  return new Set(rows.results.map((row) => row.id));
}

/** Ratings the user already gave, keyed by redemption id. */
export async function givenRatings(db: D1Database, userId: string) {
  const rows = await db.prepare(`SELECT redemption_id AS id, rating FROM reviews WHERE user_id = ?1`).bind(userId).all<{ id: string; rating: number }>();
  return new Map(rows.results.map((row) => [row.id, row.rating]));
}

export type AdminReview = PublicReview & { status: string; businessName: string; businessSlug: string; hiddenReason: string | null };

export async function listAdminReviews(db: D1Database, limit = 100): Promise<AdminReview[]> {
  const rows = await db
    .prepare(`SELECT r.id, r.rating, r.comment, r.created_at AS createdAt, r.status, r.hidden_reason AS hiddenReason,
        u.display_name AS displayName, d.title AS dealTitle, b.name AS businessName, b.slug AS businessSlug
      FROM reviews r JOIN users u ON u.id = r.user_id JOIN deals d ON d.id = r.deal_id JOIN businesses b ON b.id = r.business_id
      ORDER BY r.created_at DESC LIMIT ?1`)
    .bind(limit)
    .all<Omit<AdminReview, 'author'> & { displayName: string | null }>();
  return rows.results.map(({ displayName, ...row }) => ({ ...row, author: reviewerName(displayName) }));
}
