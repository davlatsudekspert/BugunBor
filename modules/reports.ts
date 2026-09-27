import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';
import { staffAlertStatement, teamStatement } from '@/modules/notifications/service';

// Reports from customers about a deal, a business or a review, and about a
// booked code ("the deal was not honoured"). Moderators see them in
// Admin → Shikoyatlar and get a Telegram alert.

export const REPORT_TARGETS = ['DEAL', 'BUSINESS', 'REVIEW', 'REDEMPTION'] as const;
export const REPORT_REASONS = ['WRONG_INFO', 'SCAM', 'OFFENSIVE', 'PROHIBITED', 'SPAM', 'OTHER'] as const;
/** What went wrong at the counter with a booked code (reports about a REDEMPTION). */
export const CODE_ISSUES = ['NOT_AVAILABLE', 'CODE_REFUSED', 'WRONG_PRICE', 'BRANCH_CLOSED', 'OTHER'] as const;
/** Once the cashier accepted the code, only these still make sense. */
export const USED_CODE_ISSUES: readonly CodeIssue[] = ['WRONG_PRICE', 'OTHER'];
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type CodeIssue = (typeof CODE_ISSUES)[number];

/**
 * A code can be complained about for three days after it was booked. Three
 * different people within a week put the deal on hold until a moderator looks.
 */
export const CODE_ISSUE_RULES = { windowHours: 72, holdAfter: 3, holdDays: 7 } as const;

const TARGET_SQL: Record<ReportTarget, string> = {
  DEAL: `SELECT d.title AS title FROM deals d WHERE d.id = ?1 AND d.deleted_at IS NULL`,
  BUSINESS: `SELECT b.name AS title FROM businesses b WHERE b.id = ?1 AND b.deleted_at IS NULL`,
  REVIEW: `SELECT substr(COALESCE(r.comment, ''), 1, 80) AS title FROM reviews r WHERE r.id = ?1`,
  REDEMPTION: `SELECT d.title AS title FROM redemptions r JOIN deals d ON d.id = r.deal_id WHERE r.id = ?1`,
};

export async function createReport(
  db: D1Database,
  input: { reporterId: string; targetType: ReportTarget; targetId: string; reason: ReportReason | CodeIssue; comment: string | null },
  now = new Date(),
) {
  const target = await db.prepare(TARGET_SQL[input.targetType]).bind(input.targetId).first<{ title: string }>();
  if (!target) throw new DomainError('NOT_FOUND');
  const nowDb = toDbTime(now);
  // Written only if this person has no open report about it yet, in one
  // statement: two taps at once still make one report and one alert.
  const id = crypto.randomUUID();
  const [inserted] = await db.batch([
    db.prepare(`INSERT INTO reports(id, reporter_id, target_type, target_id, reason, comment, status, created_at)
        SELECT ?1, ?2, ?3, ?4, ?5, ?6, 'NEW', ?7
        WHERE NOT EXISTS (SELECT 1 FROM reports WHERE reporter_id = ?2 AND target_type = ?3 AND target_id = ?4 AND status = 'NEW')`)
      .bind(id, input.reporterId, input.targetType, input.targetId, input.reason, input.comment, nowDb),
    staffAlertStatement(db, { kind: 'REPORT', key: id, payload: { reportId: id }, nowDb }, { sql: `EXISTS (SELECT 1 FROM reports WHERE id = ?5)`, params: [id] }),
  ]);
  if ((inserted.meta.changes ?? 0) === 1) return { id, repeated: false };
  // A second word about the same thing replaces the first.
  const open = await db
    .prepare(`UPDATE reports SET reason = ?4, comment = ?5 WHERE reporter_id = ?1 AND target_type = ?2 AND target_id = ?3 AND status = 'NEW' RETURNING id`)
    .bind(input.reporterId, input.targetType, input.targetId, input.reason, input.comment)
    .first<{ id: string }>();
  if (!open) throw new DomainError('CONFLICT');
  return { id: open.id, repeated: true };
}

export type AdminReport = {
  id: string; targetType: ReportTarget; targetId: string; reason: ReportReason | CodeIssue; comment: string | null; status: string;
  createdAt: string; title: string | null; link: string | null; reporter: string | null; count: number;
  /** The deal a report is about (itself, or the deal of a complained-about code). */
  dealId: string | null;
  /** That deal is on hold after complaints (a moderator can put it back on the air). */
  held: boolean;
};

/**
 * Open reports first, each with how many people reported the same thing
 * (for codes: open complaints about any code of the same deal).
 */
export async function listReports(db: D1Database, options: { status: 'NEW' | 'ALL' }): Promise<AdminReport[]> {
  const rows = await db
    .prepare(`SELECT r.id, r.target_type AS targetType, r.target_id AS targetId, r.reason, r.comment, r.status, r.created_at AS createdAt,
        u.display_name AS reporter, d.id AS dealId, d.complaint_hold_at IS NOT NULL AS held,
        COALESCE(d.title, b.name, substr(COALESCE(v.comment, ''), 1, 80)) AS title,
        CASE WHEN d.id IS NOT NULL THEN '/deals/' || d.slug WHEN b.id IS NOT NULL THEN '/businesses/' || b.slug ELSE '/admin/reviews' END AS link,
        CASE r.target_type
          WHEN 'REDEMPTION' THEN (SELECT COUNT(*) FROM reports o JOIN redemptions ox ON ox.id = o.target_id
            WHERE o.target_type = 'REDEMPTION' AND o.status = 'NEW' AND ox.deal_id = x.deal_id)
          ELSE (SELECT COUNT(*) FROM reports o WHERE o.target_type = r.target_type AND o.target_id = r.target_id AND o.status = 'NEW') END AS count
      FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        LEFT JOIN redemptions x ON r.target_type = 'REDEMPTION' AND x.id = r.target_id
        LEFT JOIN deals d ON d.id = CASE r.target_type WHEN 'DEAL' THEN r.target_id WHEN 'REDEMPTION' THEN x.deal_id END
        LEFT JOIN businesses b ON r.target_type = 'BUSINESS' AND b.id = r.target_id
        LEFT JOIN reviews v ON r.target_type = 'REVIEW' AND v.id = r.target_id
      WHERE ?1 = 'ALL' OR r.status = 'NEW'
      ORDER BY CASE r.status WHEN 'NEW' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 200`)
    .bind(options.status)
    .all<Omit<AdminReport, 'held'> & { held: number }>();
  return rows.results.map((row) => ({ ...row, held: Boolean(row.held) }));
}

/** Whether a code booked at [createdAt] can still be complained about. */
export const canReportCode = (createdAt: string, now = new Date()) =>
  createdAt >= toDbTime(new Date(now.getTime() - CODE_ISSUE_RULES.windowHours * 60 * 60_000));

/**
 * "The deal was not honoured": the person who booked a code says what went
 * wrong at the counter, within three days. One open complaint per code (a
 * second one replaces it). Returns whether this put the deal on hold.
 */
export async function reportCodeIssue(db: D1Database, input: { userId: string; redemptionId: string; issue: CodeIssue; comment: string | null }, now = new Date()) {
  const code = await db
    .prepare(`SELECT id, status, deal_id AS dealId, created_at AS createdAt FROM redemptions WHERE id = ?1 AND user_id = ?2`)
    .bind(input.redemptionId, input.userId)
    .first<{ id: string; status: string; dealId: string; createdAt: string }>();
  if (!code) throw new DomainError('NOT_FOUND');
  if (!canReportCode(code.createdAt, now)) throw new DomainError('ISSUE_TOO_LATE');
  if (code.status === 'COMPLETED' && !USED_CODE_ISSUES.includes(input.issue)) throw new DomainError('VALIDATION');
  const report = await createReport(db, { reporterId: input.userId, targetType: 'REDEMPTION', targetId: code.id, reason: input.issue, comment: input.comment }, now);
  return { ...report, held: await holdAfterComplaints(db, code.dealId, now) };
}

/**
 * Three different people saying within a week that a deal was not honoured
 * take it off the air: it is paused and only a moderator can put it back
 * (the business cannot resume it). The team and the moderators are told.
 * A deal the owner had just paused is held all the same, or resuming it
 * would bring it back with the complaints still open. Codes people cancelled
 * themselves do not count: booking and cancelling at once costs nothing, so
 * a few accounts could otherwise take anyone's deal down (moderators still
 * see those complaints).
 */
async function holdAfterComplaints(db: D1Database, dealId: string, now: Date) {
  const since = toDbTime(new Date(now.getTime() - CODE_ISSUE_RULES.holdDays * 24 * 60 * 60_000));
  const people =
    (await db
      .prepare(`SELECT COUNT(DISTINCT p.reporter_id) AS n FROM reports p JOIN redemptions r ON r.id = p.target_id
        WHERE p.target_type = 'REDEMPTION' AND p.status = 'NEW' AND p.created_at >= ?2 AND r.deal_id = ?1
          AND NOT (r.status = 'CANCELED' AND r.cancel_reason IS NULL)`)
      .bind(dealId, since)
      .first<{ n: number }>())?.n ?? 0;
  if (people < CODE_ISSUE_RULES.holdAfter) return false;
  const nowDb = toDbTime(now);
  const before = await db.prepare(`SELECT status FROM deals WHERE id = ?1`).bind(dealId).first<{ status: string }>();
  const held = await db
    .prepare(`UPDATE deals SET status = 'PAUSED', complaint_hold_at = ?2, updated_at = ?2
      WHERE id = ?1 AND status IN ('ACTIVE', 'PAUSED') AND complaint_hold_at IS NULL AND deleted_at IS NULL RETURNING business_id AS businessId`)
    .bind(dealId, nowDb)
    .first<{ businessId: string }>();
  if (!held) return false;
  const payload = { dealId, people: String(people) };
  await db.batch([
    auditStatement(db, { actorUserId: null, businessId: held.businessId, action: 'deal.held_after_complaints', targetType: 'Deal', targetId: dealId, reason: `${people} customers`, before: { status: before?.status ?? 'ACTIVE' }, after: { status: 'PAUSED' } }, nowDb),
    teamStatement(db, { businessId: held.businessId, kind: 'DEAL_HELD', key: `${dealId}:${nowDb}`, payload: { ...payload, audience: 'team' }, nowDb }),
    staffAlertStatement(db, { kind: 'DEAL_HELD', key: `${dealId}:${nowDb}`, payload: { ...payload, audience: 'staff' }, nowDb }),
  ]);
  return true;
}

/** The person's own complaints about their codes: code id → what they said. */
export async function codeIssuesOf(db: D1Database, userId: string) {
  const rows = await db
    .prepare(`SELECT target_id AS id, reason FROM reports WHERE reporter_id = ?1 AND target_type = 'REDEMPTION' ORDER BY created_at`)
    .bind(userId)
    .all<{ id: string; reason: CodeIssue }>();
  return new Map(rows.results.map((row) => [row.id, row.reason]));
}

export async function resolveReport(db: D1Database, input: { actorId: string; reportId: string; status: 'RESOLVED' | 'DISMISSED' }, now = new Date()) {
  const nowDb = toDbTime(now);
  const result = await db.batch([
    db.prepare(`UPDATE reports SET status = ?2, handled_at = ?3, handled_by = ?4 WHERE id = ?1 AND status = 'NEW'`).bind(input.reportId, input.status, nowDb, input.actorId),
    auditStatement(db, { actorUserId: input.actorId, action: `report.${input.status.toLowerCase()}`, targetType: 'Report', targetId: input.reportId }, nowDb),
  ]);
  if ((result[0].meta.changes ?? 0) !== 1) throw new DomainError('INVALID_TRANSITION');
}
