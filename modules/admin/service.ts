import { dealPhotoUrl } from '@/lib/photos';
import { searchPattern } from '@/lib/search';
import { startOfTashkentDay, toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import type { PlatformRole, UserStatus } from '@/modules/auth/users';
import { revokeAllSessionsStatement } from '@/modules/auth/sessions';
import { DomainError } from '@/modules/errors';

export async function adminOverview(db: D1Database, now = new Date()) {
  const nowDb = toDbTime(now);
  const dayStart = toDbTime(startOfTashkentDay(now));
  const row = await db
    .prepare(`SELECT
        (SELECT COUNT(*) FROM businesses WHERE verification_status = 'PENDING' AND deleted_at IS NULL) AS pendingBusinesses,
        (SELECT COUNT(*) FROM deals WHERE status = 'PENDING_REVIEW' AND deleted_at IS NULL) AS pendingDeals,
        (SELECT COUNT(*) FROM deals WHERE status = 'ACTIVE' AND deleted_at IS NULL AND starts_at <= ?1 AND ends_at > ?1) AS liveDeals,
        (SELECT COUNT(*) FROM users WHERE status != 'DELETED' AND id != 'usr_system') AS users,
        (SELECT COUNT(*) FROM redemptions WHERE created_at >= ?2) AS claimsToday,
        (SELECT COUNT(*) FROM redemptions WHERE status = 'COMPLETED' AND completed_at >= ?2) AS redeemedToday,
        (SELECT COUNT(*) FROM contact_messages WHERE status = 'NEW') AS newMessages,
        (SELECT COUNT(*) FROM billing_requests WHERE status = 'PENDING') AS pendingPayments`)
    .bind(nowDb, dayStart)
    .first<Record<'pendingBusinesses' | 'pendingDeals' | 'liveDeals' | 'users' | 'claimsToday' | 'redeemedToday' | 'newMessages' | 'pendingPayments', number>>();
  return row!;
}

/** What the automatic moderation did in the last week, for the overview. */
export async function automationSummary(db: D1Database, now = new Date()) {
  const since = toDbTime(new Date(now.getTime() - 7 * 86_400_000));
  const row = await db
    .prepare(`SELECT
        (SELECT COUNT(*) FROM moderation_actions WHERE actor_user_id = 'usr_system' AND target_type = 'Business' AND action = 'APPROVE' AND created_at >= ?1) AS businesses,
        (SELECT COUNT(*) FROM moderation_actions WHERE actor_user_id = 'usr_system' AND target_type = 'Deal' AND action = 'APPROVE' AND created_at >= ?1) AS deals,
        (SELECT COUNT(*) FROM audit_logs WHERE actor_user_id = 'usr_system' AND action = 'review.hidden' AND created_at >= ?1) AS reviews,
        (SELECT COUNT(*) FROM businesses WHERE verification_status = 'PENDING' AND deleted_at IS NULL AND auto_review_note != '')
          + (SELECT COUNT(*) FROM deals WHERE status = 'PENDING_REVIEW' AND deleted_at IS NULL AND auto_review_note != '') AS held`)
    .bind(since)
    .first<Record<'businesses' | 'deals' | 'reviews' | 'held', number>>();
  return row!;
}

/** Latest moderation decision on an item was made by the system (aliases: outer table `alias`). */
const autoDecidedSql = (targetType: 'Business' | 'Deal', alias: string) =>
  `(SELECT ma.actor_user_id = 'usr_system' FROM moderation_actions ma WHERE ma.target_type = '${targetType}' AND ma.target_id = ${alias}.id ORDER BY ma.created_at DESC, ma.rowid DESC LIMIT 1)`;

export type AdminBusiness = {
  id: string; slug: string; name: string; description: string; city: string; phone: string | null; categoryName: string | null;
  verificationStatus: string; rejectionReason: string | null; suspendedAt: string | null; suspendedReason: string | null;
  createdAt: string; trialEndsAt: string | null; paidUntil: string | null; planCode: string | null; isDemo: number;
  ownerName: string | null; ownerPhone: string | null; branchCount: number; dealCount: number;
  logoId: string | null; coverId: string | null;
  /** Reasons the automatic check held it back ('' = checked, nothing found; null = not checked). */
  autoNote: string | null;
  autoDecided: number | null;
};

export type AdminListFilter = 'pending' | 'auto' | 'all';

export async function listAdminBusinesses(db: D1Database, filter: { list: AdminListFilter; query?: string | null }, now = new Date()) {
  const where =
    filter.list === 'pending'
      ? `b.verification_status = 'PENDING'`
      : filter.list === 'auto'
        ? `b.verification_status = 'VERIFIED' AND b.verified_at >= ?2 AND ${autoDecidedSql('Business', 'b')} = 1`
        : `1 = 1`;
  const rows = await db
    .prepare(`SELECT b.id, b.slug, b.name, b.description, b.city, b.phone, c.name_uz AS categoryName, b.verification_status AS verificationStatus,
        b.rejection_reason AS rejectionReason, b.suspended_at AS suspendedAt, b.suspended_reason AS suspendedReason, b.created_at AS createdAt,
        b.trial_ends_at AS trialEndsAt, b.paid_until AS paidUntil, b.plan_code AS planCode, b.is_demo AS isDemo,
        b.logo_id AS logoId, b.cover_id AS coverId, b.auto_review_note AS autoNote, ${autoDecidedSql('Business', 'b')} AS autoDecided,
        (SELECT u.display_name FROM business_members m JOIN users u ON u.id = m.user_id WHERE m.business_id = b.id AND m.role = 'OWNER' AND m.revoked_at IS NULL LIMIT 1) AS ownerName,
        (SELECT u.phone FROM business_members m JOIN users u ON u.id = m.user_id WHERE m.business_id = b.id AND m.role = 'OWNER' AND m.revoked_at IS NULL LIMIT 1) AS ownerPhone,
        (SELECT COUNT(*) FROM branches br WHERE br.business_id = b.id AND br.deleted_at IS NULL) AS branchCount,
        (SELECT COUNT(*) FROM deals d WHERE d.business_id = b.id AND d.deleted_at IS NULL) AS dealCount
      FROM businesses b LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.deleted_at IS NULL AND ${where} AND (?1 IS NULL OR b.search_text LIKE ?1) AND (?2 IS NOT NULL)
      ORDER BY CASE b.verification_status WHEN 'PENDING' THEN 0 ELSE 1 END, b.created_at DESC LIMIT 200`)
    .bind(searchPattern(filter.query), toDbTime(new Date(now.getTime() - 7 * 86_400_000)))
    .all<AdminBusiness>();
  return rows.results;
}

export type AdminDeal = {
  id: string; slug: string; title: string; description: string; terms: string; status: string; startsAt: string; endsAt: string;
  originalPrice: number | null; price: number; discountPercent: number; total: number | null; remaining: number | null;
  perCustomerLimit: number; claimTtlMinutes: number; visual: string | null; categorySlug: string; categoryName: string;
  businessId: string; businessName: string; businessStatus: string; submittedAt: string | null; branchNames: string | null; isDemo: number;
  photo: string | null;
  /** The business uploaded this photo (not a demo stock photo). */
  ownPhoto: boolean;
  autoNote: string | null;
  autoDecided: number | null;
};

export async function listAdminDeals(db: D1Database, filter: 'pending' | 'auto' | 'live' | 'all', now = new Date()) {
  const nowDb = toDbTime(now);
  const where =
    filter === 'pending'
      ? `d.status = 'PENDING_REVIEW'`
      : filter === 'auto'
        ? `d.status IN ('ACTIVE', 'PAUSED') AND d.approved_at >= ?2 AND ${autoDecidedSql('Deal', 'd')} = 1`
        : filter === 'live'
          ? `d.status IN ('ACTIVE', 'PAUSED') AND d.ends_at > ?1`
          : `1 = 1`;
  const rows = await db
    .prepare(`SELECT d.id, d.slug, d.title, d.description, d.terms, d.status, d.starts_at AS startsAt, d.ends_at AS endsAt,
        d.original_price_uzs AS originalPrice, d.discounted_price_uzs AS price, d.discount_percent AS discountPercent,
        d.total_quantity AS total, d.remaining_quantity AS remaining, d.per_customer_limit AS perCustomerLimit,
        d.claim_ttl_minutes AS claimTtlMinutes, d.visual, c.slug AS categorySlug, c.name_uz AS categoryName,
        b.id AS businessId, b.name AS businessName, b.verification_status AS businessStatus, d.submitted_at AS submittedAt, d.is_demo AS isDemo,
        d.photo_id AS photoId, d.auto_review_note AS autoNote, ${autoDecidedSql('Deal', 'd')} AS autoDecided,
        (SELECT GROUP_CONCAT(br.name, ', ') FROM deal_branches db JOIN branches br ON br.id = db.branch_id WHERE db.deal_id = d.id AND br.deleted_at IS NULL) AS branchNames
      FROM deals d JOIN businesses b ON b.id = d.business_id JOIN categories c ON c.id = d.category_id
      WHERE d.deleted_at IS NULL AND ${where} AND (?1 IS NOT NULL) AND (?2 IS NOT NULL)
      ORDER BY COALESCE(d.submitted_at, d.created_at) ${filter === 'pending' ? 'ASC' : 'DESC'} LIMIT 200`)
    .bind(nowDb, toDbTime(new Date(now.getTime() - 7 * 86_400_000)))
    .all<Omit<AdminDeal, 'photo' | 'ownPhoto'> & { photoId: string | null }>();
  return rows.results.map(({ photoId, ...row }) => ({ ...row, photo: dealPhotoUrl({ photoId, isDemo: row.isDemo, visual: row.visual, slug: row.slug }), ownPhoto: Boolean(photoId) }));
}

export type AdminUser = { id: string; displayName: string; phone: string | null; role: PlatformRole; status: UserStatus; createdAt: string; lastLoginAt: string | null; businesses: number };

export async function listAdminUsers(db: D1Database, query: string | null) {
  const digits = query?.replace(/\D/g, '') ?? '';
  const rows = await db
    .prepare(`SELECT u.id, u.display_name AS displayName, u.phone, u.role, u.status, u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
        (SELECT COUNT(*) FROM business_members m WHERE m.user_id = u.id AND m.revoked_at IS NULL) AS businesses
      FROM users u
      WHERE u.status != 'DELETED' AND u.id != 'usr_system' AND (?1 = '' OR u.display_name LIKE ?2 OR (?3 != '' AND u.phone LIKE ?4))
      ORDER BY CASE u.role WHEN 'ADMIN' THEN 0 WHEN 'MODERATOR' THEN 1 ELSE 2 END, u.created_at DESC LIMIT 200`)
    .bind(query?.trim() ?? '', `%${query?.trim() ?? ''}%`, digits, `%${digits}%`)
    .all<AdminUser>();
  return rows.results;
}

export async function updateUser(db: D1Database, input: { actorId: string; userId: string; role?: PlatformRole; status?: 'ACTIVE' | 'BLOCKED' }, now = new Date()) {
  if (input.actorId === input.userId) throw new DomainError('SELF_ACTION');
  // The system moderator signs automatic decisions; it is switched on and off in the settings, not here.
  if (input.userId === 'usr_system') throw new DomainError('NOT_FOUND');
  const current = await db.prepare(`SELECT role, status FROM users WHERE id = ?1 AND status != 'DELETED'`).bind(input.userId).first<{ role: string; status: string }>();
  if (!current) throw new DomainError('NOT_FOUND');
  const nowDb = toDbTime(now);
  const role = input.role ?? current.role;
  const status = input.status ?? current.status;
  const statements = [
    db.prepare(`UPDATE users SET role = ?2, status = ?3, updated_at = ?4 WHERE id = ?1`).bind(input.userId, role, status, nowDb),
    auditStatement(db, { actorUserId: input.actorId, action: 'user.updated', targetType: 'User', targetId: input.userId, before: current, after: { role, status } }, nowDb),
  ];
  if (status === 'BLOCKED') statements.push(revokeAllSessionsStatement(db, input.userId, nowDb));
  await db.batch(statements);
}

export type CategoryInput = { id?: string | null; slug: string; nameUz: string; nameRu: string; icon: string; sortOrder: number; isActive: boolean };

export async function saveCategory(db: D1Database, input: CategoryInput & { actorId: string }, now = new Date()) {
  const nowDb = toDbTime(now);
  const clash = await db.prepare(`SELECT id FROM categories WHERE slug = ?1 AND id != ?2`).bind(input.slug, input.id ?? '').first();
  if (clash) throw new DomainError('SLUG_TAKEN');
  const id = input.id ?? `cat_${input.slug.replaceAll('-', '_')}`;
  await db.batch([
    db.prepare(`INSERT INTO categories(id, slug, name_uz, name_ru, icon, sort_order, is_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name_uz = excluded.name_uz, name_ru = excluded.name_ru, icon = excluded.icon,
        sort_order = excluded.sort_order, is_active = excluded.is_active`)
      .bind(id, input.slug, input.nameUz, input.nameRu, input.icon, input.sortOrder, input.isActive ? 1 : 0),
    auditStatement(db, { actorUserId: input.actorId, action: input.id ? 'category.updated' : 'category.created', targetType: 'Category', targetId: id, after: { slug: input.slug, nameUz: input.nameUz, isActive: input.isActive } }, nowDb),
  ]);
  return { id };
}

export type ContactMessage = { id: string; name: string; contact: string; subject: string; message: string; status: string; createdAt: string; userId: string | null };

export async function listMessages(db: D1Database, status: string | null) {
  const rows = await db
    .prepare(`SELECT id, name, contact, subject, message, status, created_at AS createdAt, user_id AS userId FROM contact_messages
      WHERE (?1 IS NULL OR status = ?1) ORDER BY CASE status WHEN 'NEW' THEN 0 WHEN 'READ' THEN 1 ELSE 2 END, created_at DESC LIMIT 200`)
    .bind(status)
    .all<ContactMessage>();
  return rows.results;
}

export async function setMessageStatus(db: D1Database, input: { messageId: string; status: 'NEW' | 'READ' | 'ARCHIVED' }, now = new Date()) {
  const result = await db
    .prepare(`UPDATE contact_messages SET status = ?2, handled_at = ?3 WHERE id = ?1`)
    .bind(input.messageId, input.status, toDbTime(now))
    .run();
  if ((result.meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
}

export type AuditRow = { id: string; createdAt: string; action: string; targetType: string; targetId: string; reason: string | null; actorName: string | null; businessName: string | null; afterJson: string | null };

export async function listAudit(db: D1Database, limit = 200) {
  const rows = await db
    .prepare(`SELECT a.id, a.created_at AS createdAt, a.action, a.target_type AS targetType, a.target_id AS targetId, a.reason,
        u.display_name AS actorName, b.name AS businessName, a.after_json AS afterJson
      FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id LEFT JOIN businesses b ON b.id = a.business_id
      ORDER BY a.created_at DESC, a.rowid DESC LIMIT ?1`)
    .bind(limit)
    .all<AuditRow>();
  return rows.results;
}

export type PlanUpdate = { code: string; priceMonthlyUzs: number; maxBranches: number | null; maxLiveDeals: number | null; maxStaff: number | null; topSlots: number; isActive: boolean };

export async function updatePlan(db: D1Database, input: PlanUpdate & { actorId: string }, now = new Date()) {
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`UPDATE plans SET price_monthly_uzs = ?2, max_branches = ?3, max_live_deals = ?4, max_staff = ?5, top_slots = ?6, is_active = ?7, updated_at = ?8 WHERE code = ?1`)
      .bind(input.code, input.priceMonthlyUzs, input.maxBranches, input.maxLiveDeals, input.maxStaff, input.topSlots, input.isActive ? 1 : 0, nowDb),
    auditStatement(db, { actorUserId: input.actorId, action: 'plan.updated', targetType: 'Plan', targetId: input.code, after: { price: input.priceMonthlyUzs, maxBranches: input.maxBranches, maxLiveDeals: input.maxLiveDeals, maxStaff: input.maxStaff, topSlots: input.topSlots, isActive: input.isActive } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
}

export async function updateSettings(db: D1Database, input: { actorId: string; values: Record<string, string> }, now = new Date()) {
  const nowDb = toDbTime(now);
  await db.batch([
    ...Object.entries(input.values).map(([key, value]) =>
      db.prepare(`INSERT INTO app_settings(key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).bind(key, value, nowDb, input.actorId),
    ),
    auditStatement(db, { actorUserId: input.actorId, action: 'settings.updated', targetType: 'Settings', targetId: 'app', after: Object.keys(input.values) }, nowDb),
  ]);
}

export type BillingRequestRow = { id: string; businessId: string; businessName: string; planCode: string; months: number; amount: number; status: string; createdAt: string; requesterName: string | null; requesterPhone: string | null; note: string | null; paying: number };

export async function listBillingRequests(db: D1Database, status: string | null) {
  const rows = await db
    .prepare(`SELECT r.id, r.business_id AS businessId, b.name AS businessName, r.plan_code AS planCode, r.months, r.amount_uzs AS amount,
        r.status, r.created_at AS createdAt, u.display_name AS requesterName, u.phone AS requesterPhone, r.note,
        EXISTS (SELECT 1 FROM payments p WHERE p.billing_request_id = r.id AND p.state = 1) AS paying
      FROM billing_requests r JOIN businesses b ON b.id = r.business_id LEFT JOIN users u ON u.id = r.requested_by
      WHERE (?1 IS NULL OR r.status = ?1) ORDER BY r.created_at DESC LIMIT 200`)
    .bind(status)
    .all<BillingRequestRow>();
  return rows.results;
}

export type AppUsage = { activeUsers: number; devices: number; latestBuild: string | null; openReports: number };

/** Who uses the mobile app (sessions seen in the last 30 days), push devices and open reports. */
export async function appUsage(db: D1Database, now = new Date()): Promise<AppUsage> {
  const since = toDbTime(new Date(now.getTime() - 30 * 24 * 60 * 60_000));
  const row = await db
    .prepare(`SELECT
        (SELECT COUNT(DISTINCT user_id) FROM sessions WHERE client = 'app' AND last_seen_at >= ?1) AS activeUsers,
        (SELECT COUNT(*) FROM devices) AS devices,
        (SELECT app_build FROM sessions WHERE client = 'app' AND app_build IS NOT NULL ORDER BY CAST(app_build AS INTEGER) DESC LIMIT 1) AS latestBuild,
        (SELECT COUNT(*) FROM reports WHERE status = 'NEW') AS openReports`)
    .bind(since)
    .first<AppUsage>();
  return row ?? { activeUsers: 0, devices: 0, latestBuild: null, openReports: 0 };
}
