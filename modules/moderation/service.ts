import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { getBillingSettings, trialStartStatement } from '@/modules/billing/service';
import { DomainError } from '@/modules/errors';

export type Decision = 'APPROVE' | 'REJECT';
export const MIN_REASON_LENGTH = 10;

function checkReason(decision: Decision, reason: string) {
  if (decision === 'REJECT' && reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('VALIDATION');
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
    .prepare(`SELECT d.status, d.business_id AS businessId, b.verification_status AS businessStatus
      FROM deals d JOIN businesses b ON b.id = d.business_id WHERE d.id = ?1 AND d.deleted_at IS NULL`)
    .bind(input.dealId)
    .first<{ status: string; businessId: string; businessStatus: string }>();
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
  const results = await db.batch(statements);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  return { status: next };
}

export async function setBusinessSuspended(db: D1Database, input: { actorId: string; businessId: string; suspended: boolean; reason: string }, now = new Date()) {
  if (input.suspended && input.reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('VALIDATION');
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
  if (input.reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('VALIDATION');
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

/** Moderators can take down an inappropriate logo, cover or deal photo without touching anything else. */
export async function removeImagesByModerator(db: D1Database, input: { actorId: string; target: 'BUSINESS' | 'DEAL'; id: string; reason: string }, now = new Date()) {
  if (input.reason.trim().length < MIN_REASON_LENGTH) throw new DomainError('VALIDATION');
  const nowDb = toDbTime(now);
  const update =
    input.target === 'BUSINESS'
      ? db.prepare(`UPDATE businesses SET logo_id = NULL, cover_id = NULL, updated_at = ?2 WHERE id = ?1 AND deleted_at IS NULL`).bind(input.id, nowDb)
      : db.prepare(`UPDATE deals SET photo_id = NULL, updated_at = ?2 WHERE id = ?1 AND deleted_at IS NULL`).bind(input.id, nowDb);
  const results = await db.batch([
    update,
    moderationStatement(db, { actorId: input.actorId, targetType: input.target === 'BUSINESS' ? 'Business' : 'Deal', targetId: input.id, action: 'REMOVE_IMAGES', reason: input.reason.trim(), before: {}, after: {} }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
}
