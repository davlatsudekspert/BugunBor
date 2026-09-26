import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';
import { staffAlertStatement } from '@/modules/notifications/service';

// Reports from customers about a deal, a business or a review. Moderators
// see them in Admin → Shikoyatlar and get a Telegram alert.

export const REPORT_TARGETS = ['DEAL', 'BUSINESS', 'REVIEW'] as const;
export const REPORT_REASONS = ['WRONG_INFO', 'SCAM', 'OFFENSIVE', 'PROHIBITED', 'SPAM', 'OTHER'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];

const TARGET_SQL: Record<ReportTarget, string> = {
  DEAL: `SELECT d.title AS title FROM deals d WHERE d.id = ?1 AND d.deleted_at IS NULL`,
  BUSINESS: `SELECT b.name AS title FROM businesses b WHERE b.id = ?1 AND b.deleted_at IS NULL`,
  REVIEW: `SELECT substr(COALESCE(r.comment, ''), 1, 80) AS title FROM reviews r WHERE r.id = ?1`,
};

export async function createReport(
  db: D1Database,
  input: { reporterId: string; targetType: ReportTarget; targetId: string; reason: ReportReason; comment: string | null },
  now = new Date(),
) {
  const target = await db.prepare(TARGET_SQL[input.targetType]).bind(input.targetId).first<{ title: string }>();
  if (!target) throw new DomainError('NOT_FOUND');
  const nowDb = toDbTime(now);
  const open = await db
    .prepare(`SELECT id FROM reports WHERE reporter_id = ?1 AND target_type = ?2 AND target_id = ?3 AND status = 'NEW'`)
    .bind(input.reporterId, input.targetType, input.targetId)
    .first<{ id: string }>();
  if (open) {
    await db.prepare(`UPDATE reports SET reason = ?2, comment = ?3 WHERE id = ?1`).bind(open.id, input.reason, input.comment).run();
    return { id: open.id, repeated: true };
  }
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO reports(id, reporter_id, target_type, target_id, reason, comment, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'NEW', ?7)`)
      .bind(id, input.reporterId, input.targetType, input.targetId, input.reason, input.comment, nowDb),
    staffAlertStatement(db, { kind: 'REPORT', key: id, payload: { reportId: id }, nowDb }),
  ]);
  return { id, repeated: false };
}

export type AdminReport = {
  id: string; targetType: ReportTarget; targetId: string; reason: ReportReason; comment: string | null; status: string;
  createdAt: string; title: string | null; link: string | null; reporter: string | null; count: number;
};

/** Open reports first, each with how many people reported the same thing. */
export async function listReports(db: D1Database, options: { status: 'NEW' | 'ALL' }): Promise<AdminReport[]> {
  const rows = await db
    .prepare(`SELECT r.id, r.target_type AS targetType, r.target_id AS targetId, r.reason, r.comment, r.status, r.created_at AS createdAt,
        u.display_name AS reporter,
        CASE r.target_type
          WHEN 'DEAL' THEN (SELECT title FROM deals WHERE id = r.target_id)
          WHEN 'BUSINESS' THEN (SELECT name FROM businesses WHERE id = r.target_id)
          ELSE (SELECT substr(COALESCE(comment, ''), 1, 80) FROM reviews WHERE id = r.target_id) END AS title,
        CASE r.target_type
          WHEN 'DEAL' THEN (SELECT '/deals/' || slug FROM deals WHERE id = r.target_id)
          WHEN 'BUSINESS' THEN (SELECT '/businesses/' || slug FROM businesses WHERE id = r.target_id)
          ELSE '/admin/reviews' END AS link,
        (SELECT COUNT(*) FROM reports o WHERE o.target_type = r.target_type AND o.target_id = r.target_id AND o.status = 'NEW') AS count
      FROM reports r LEFT JOIN users u ON u.id = r.reporter_id
      WHERE ?1 = 'ALL' OR r.status = 'NEW'
      ORDER BY CASE r.status WHEN 'NEW' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 200`)
    .bind(options.status)
    .all<AdminReport>();
  return rows.results;
}

export async function resolveReport(db: D1Database, input: { actorId: string; reportId: string; status: 'RESOLVED' | 'DISMISSED' }, now = new Date()) {
  const nowDb = toDbTime(now);
  const result = await db.batch([
    db.prepare(`UPDATE reports SET status = ?2, handled_at = ?3, handled_by = ?4 WHERE id = ?1 AND status = 'NEW'`).bind(input.reportId, input.status, nowDb, input.actorId),
    auditStatement(db, { actorUserId: input.actorId, action: `report.${input.status.toLowerCase()}`, targetType: 'Report', targetId: input.reportId }, nowDb),
  ]);
  if ((result[0].meta.changes ?? 0) !== 1) throw new DomainError('INVALID_TRANSITION');
}
