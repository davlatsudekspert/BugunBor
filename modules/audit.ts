export type AuditEntry = {
  actorUserId: string | null;
  businessId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
};

const toJson = (value: unknown) => (value === undefined ? null : JSON.stringify(value));

const COLUMNS = `audit_logs(id, actor_user_id, business_id, action, target_type, target_id, reason, before_json, after_json, created_at)`;

function values(entry: AuditEntry, createdAt: string) {
  return [
    crypto.randomUUID(),
    entry.actorUserId,
    entry.businessId ?? null,
    entry.action,
    entry.targetType,
    entry.targetId,
    entry.reason ?? null,
    toJson(entry.before),
    toJson(entry.after),
    createdAt,
  ];
}

/** An append-only audit row, meant to be included in the same batch as the change. */
export function auditStatement(db: D1Database, entry: AuditEntry, createdAt: string) {
  return db.prepare(`INSERT INTO ${COLUMNS} VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`).bind(...values(entry, createdAt));
}

/**
 * An audit row written only if `condition` holds when the batch reaches it,
 * e.g. "the conditional UPDATE earlier in this batch changed a row".
 * The condition's own parameters are numbered from ?11.
 */
export function auditStatementIf(db: D1Database, entry: AuditEntry, createdAt: string, condition: string, ...params: unknown[]) {
  return db
    .prepare(`INSERT INTO ${COLUMNS} SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10 WHERE ${condition}`)
    .bind(...values(entry, createdAt), ...params);
}
