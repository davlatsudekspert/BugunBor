import { parseDbTime, toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { getBillingSettings, trialStartStatement } from '@/modules/billing/service';
import { DomainError } from '@/modules/errors';
import { interestDealStatement } from '@/modules/notifications/nearby';
import { followersNewDealStatement, teamStatement } from '@/modules/notifications/service';

export type Decision = 'APPROVE' | 'REJECT';
export const MIN_REASON_LENGTH = 10;

function checkReason(decision: Decision, reason: string) {
  if (decision === 'REJECT' && reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('REASON_REQUIRED');
}

function moderationStatement(db: D1Database, input: { actorId: string; targetType: string; targetId: string; action: string; reason: string; before: unknown; after: unknown }, nowDb: string) {
  return db
    .prepare(`INSERT INTO moderation_actions(id, actor_user_id, target_type, target_id, action, reason, before_json, after_json, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
    .bind(crypto.randomUUID(), input.actorId, input.targetType, input.targetId, input.action, input.reason, JSON.stringify(input.before), JSON.stringify(input.after), nowDb);
}

/** Approving publishes the deal (it goes live at its start time); rejecting returns it with a reason. */
export async function decideDeal(db: D1Database, input: { actorId: string; dealId: string; decision: Decision; reason: string }, now = new Date()) {
  checkReason(input.decision, input.reason);
  const deal = await db
    .prepare(`SELECT d.status, d.business_id AS businessId, d.starts_at AS startsAt, b.verification_status AS businessStatus
      FROM deals d JOIN businesses b ON b.id = d.business_id WHERE d.id = ?1 AND d.deleted_at IS NULL`)
    .bind(input.dealId)
    .first<{ status: string; businessId: string; startsAt: string; businessStatus: string }>();
  if (!deal) throw new DomainError('NOT_FOUND');
  if (deal.status !== 'PENDING_REVIEW') throw new DomainError('INVALID_TRANSITION');
  if (input.decision === 'APPROVE' && deal.businessStatus !== 'VERIFIED') throw new DomainError('BUSINESS_NOT_VERIFIED');
  const next = input.decision === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
  const reason = input.reason.trim() || 'Approved';
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`UPDATE deals SET status = ?2, updated_at = ?3,
        approved_at = CASE WHEN ?2 = 'ACTIVE' THEN ?3 ELSE approved_at END,
        rejection_reason = CASE WHEN ?2 = 'REJECTED' THEN ?4 ELSE NULL END
      WHERE id = ?1 AND status = 'PENDING_REVIEW'`)
      .bind(input.dealId, next, nowDb, reason),
    moderationStatement(db, { actorId: input.actorId, targetType: 'Deal', targetId: input.dealId, action: input.decision, reason, before: { status: deal.status }, after: { status: next } }, nowDb),
    auditStatement(db, { actorUserId: input.actorId, businessId: deal.businessId, action: 'deal.moderated', targetType: 'Deal', targetId: input.dealId, reason, before: { status: deal.status }, after: { status: next } }, nowDb),
    ...(next === 'ACTIVE'
      ? [
          // Followers hear about it when it actually starts.
          followersNewDealStatement(db, { dealId: input.dealId, sendAfter: deal.startsAt > nowDb ? deal.startsAt : nowDb, nowDb }),
          interestDealStatement(db, { dealId: input.dealId, sendAfter: deal.startsAt > nowDb ? parseDbTime(deal.startsAt) : now, nowDb }),
          teamStatement(db, { businessId: deal.businessId, kind: 'DEAL_APPROVED', key: input.dealId, payload: { dealId: input.dealId }, nowDb }),
        ]
      : [teamStatement(db, { businessId: deal.businessId, kind: 'DEAL_REJECTED', key: `${input.dealId}:${nowDb}`, payload: { dealId: input.dealId, reason }, nowDb })]),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  return { status: next };
}

/** Verifying a business starts its free period (length from settings). */
export async function decideBusiness(db: D1Database, input: { actorId: string; businessId: string; decision: Decision; reason: string }, now = new Date()) {
  checkReason(input.decision, input.reason);
  const business = await db
    .prepare(`SELECT verification_status AS status FROM businesses WHERE id = ?1 AND deleted_at IS NULL`)
    .bind(input.businessId)
    .first<{ status: string }>();
  if (!business) throw new DomainError('NOT_FOUND');
  if (business.status !== 'PENDING') throw new DomainError('INVALID_TRANSITION');
  const next = input.decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
  const reason = input.reason.trim() || 'Approved';
  const nowDb = toDbTime(now);
  const settings = await getBillingSettings(db);
  const statements = [
    db.prepare(`UPDATE businesses SET verification_status = ?2, updated_at = ?3,
        verified_at = CASE WHEN ?2 = 'VERIFIED' THEN ?3 ELSE verified_at END,
        rejection_reason = CASE WHEN ?2 = 'REJECTED' THEN ?4 ELSE NULL END
      WHERE id = ?1 AND verification_status = 'PENDING'`)
      .bind(input.businessId, next, nowDb, reason),
    moderationStatement(db, { actorId: input.actorId, targetType: 'Business', targetId: input.businessId, action: input.decision, reason, before: { status: business.status }, after: { status: next } }, nowDb),
    auditStatement(db, { actorUserId: input.actorId, businessId: input.businessId, action: 'business.moderated', targetType: 'Business', targetId: input.businessId, reason, before: { status: business.status }, after: { status: next } }, nowDb),
  ];
  if (next === 'VERIFIED') statements.push(trialStartStatement(db, input.businessId, settings.trialMonths, now));
  statements.push(
    next === 'VERIFIED'
      ? teamStatement(db, { businessId: input.businessId, kind: 'BUSINESS_APPROVED', key: input.businessId, payload: { businessId: input.businessId }, nowDb })
      : teamStatement(db, { businessId: input.businessId, kind: 'BUSINESS_REJECTED', key: `${input.businessId}:${nowDb}`, payload: { businessId: input.businessId, reason }, nowDb }),
  );
  const results = await db.batch(statements);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  return { status: next };
}

export async function setBusinessSuspended(db: D1Database, input: { actorId: string; businessId: string; suspended: boolean; reason: string }, now = new Date()) {
  if (input.suspended && input.reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('REASON_REQUIRED');
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`UPDATE businesses SET suspended_at = ?2, suspended_reason = ?3, updated_at = ?4 WHERE id = ?1 AND deleted_at IS NULL`)
      .bind(input.businessId, input.suspended ? nowDb : null, input.suspended ? input.reason.trim() : null, nowDb),
    auditStatement(db, { actorUserId: input.actorId, businessId: input.businessId, action: input.suspended ? 'business.suspended' : 'business.unsuspended', targetType: 'Business', targetId: input.businessId, reason: input.reason.trim() || null }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
}

/** Moderators can end a live deal that breaks the rules. */
export async function archiveDealByModerator(db: D1Database, input: { actorId: string; dealId: string; reason: string }, now = new Date()) {
  if (input.reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('REASON_REQUIRED');
  const deal = await db.prepare(`SELECT status, business_id AS businessId FROM deals WHERE id = ?1 AND deleted_at IS NULL`).bind(input.dealId).first<{ status: string; businessId: string }>();
  if (!deal) throw new DomainError('NOT_FOUND');
  if (deal.status !== 'ACTIVE' && deal.status !== 'PAUSED') throw new DomainError('INVALID_TRANSITION');
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE deals SET status = 'ARCHIVED', archived_at = ?2, is_sponsored = 0, updated_at = ?2 WHERE id = ?1`).bind(input.dealId, nowDb),
    moderationStatement(db, { actorId: input.actorId, targetType: 'Deal', targetId: input.dealId, action: 'ARCHIVE', reason: input.reason.trim(), before: { status: deal.status }, after: { status: 'ARCHIVED' } }, nowDb),
    auditStatement(db, { actorUserId: input.actorId, businessId: deal.businessId, action: 'deal.archived_by_moderator', targetType: 'Deal', targetId: input.dealId, reason: input.reason.trim(), before: { status: deal.status }, after: { status: 'ARCHIVED' } }, nowDb),
  ]);
}

/**
 * A moderator looked into the complaints about a held deal: it goes back on
 * the air (while its time lasts) and the open complaints about it are closed.
 */
export async function releaseDealHold(db: D1Database, input: { actorId: string; dealId: string }, now = new Date()) {
  const deal = await db
    .prepare(`SELECT status, business_id AS businessId, complaint_hold_at AS heldAt FROM deals WHERE id = ?1 AND deleted_at IS NULL`)
    .bind(input.dealId)
    .first<{ status: string; businessId: string; heldAt: string | null }>();
  if (!deal) throw new DomainError('NOT_FOUND');
  if (!deal.heldAt) throw new DomainError('INVALID_TRANSITION');
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE deals SET complaint_hold_at = NULL, updated_at = ?2,
        status = CASE WHEN status = 'PAUSED' AND ends_at > ?2 THEN 'ACTIVE' ELSE status END
      WHERE id = ?1`).bind(input.dealId, nowDb),
    db.prepare(`UPDATE reports SET status = 'RESOLVED', handled_at = ?2, handled_by = ?3
      WHERE status = 'NEW' AND target_type = 'REDEMPTION' AND target_id IN (SELECT id FROM redemptions WHERE deal_id = ?1)`).bind(input.dealId, nowDb, input.actorId),
    moderationStatement(db, { actorId: input.actorId, targetType: 'Deal', targetId: input.dealId, action: 'RELEASE', reason: 'complaints checked', before: { status: deal.status, heldAt: deal.heldAt }, after: {} }, nowDb),
    auditStatement(db, { actorUserId: input.actorId, businessId: deal.businessId, action: 'deal.released', targetType: 'Deal', targetId: input.dealId, before: { status: deal.status } }, nowDb),
  ]);
}

/**
 * Moderators can take down an inappropriate logo, cover or deal photo without
 * touching anything else. The image itself is deleted at once, together with
 * every other place it was used (a copied deal), so its link stops working.
 * Returns the ids of the deleted images.
 */
export async function removeImagesByModerator(db: D1Database, input: { actorId: string; target: 'BUSINESS' | 'DEAL'; id: string; reason: string }, now = new Date()) {
  if (input.reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('REASON_REQUIRED');
  const nowDb = toDbTime(now);
  const current =
    input.target === 'BUSINESS'
      ? await db.prepare(`SELECT logo_id AS first, cover_id AS second FROM businesses WHERE id = ?1 AND deleted_at IS NULL`).bind(input.id).first<{ first: string | null; second: string | null }>()
      : await db.prepare(`SELECT photo_id AS first, NULL AS second FROM deals WHERE id = ?1 AND deleted_at IS NULL`).bind(input.id).first<{ first: string | null; second: string | null }>();
  if (!current) throw new DomainError('NOT_FOUND');
  const images = [...new Set([current.first, current.second].filter((image): image is string => Boolean(image)))];
  const update =
    input.target === 'BUSINESS'
      ? db.prepare(`UPDATE businesses SET logo_id = NULL, cover_id = NULL, updated_at = ?2 WHERE id = ?1 AND deleted_at IS NULL`).bind(input.id, nowDb)
      : db.prepare(`UPDATE deals SET photo_id = NULL, updated_at = ?2 WHERE id = ?1 AND deleted_at IS NULL`).bind(input.id, nowDb);
  const results = await db.batch([
    update,
    ...images.flatMap((image) => [
      db.prepare(`UPDATE deals SET photo_id = NULL, updated_at = ?2 WHERE photo_id = ?1`).bind(image, nowDb),
      db.prepare(`UPDATE businesses SET logo_id = CASE WHEN logo_id = ?1 THEN NULL ELSE logo_id END,
          cover_id = CASE WHEN cover_id = ?1 THEN NULL ELSE cover_id END, updated_at = ?2
        WHERE logo_id = ?1 OR cover_id = ?1`).bind(image, nowDb),
      db.prepare(`DELETE FROM media WHERE id = ?1`).bind(image),
    ]),
    moderationStatement(db, { actorId: input.actorId, targetType: input.target === 'BUSINESS' ? 'Business' : 'Deal', targetId: input.id, action: 'REMOVE_IMAGES', reason: input.reason.trim(), before: { images }, after: {} }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
  return images;
}
