import { getCity } from '@/lib/cities';
import { maskPhone } from '@/lib/format';
import { serializeHours } from '@/lib/hours';
import { buildSearchText, slugify } from '@/lib/search';
import { startOfTashkentDay, toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import type { BusinessRole } from '@/modules/auth/authorization';
import { getUserByPhone } from '@/modules/auth/users';
import { assertWithinLimit } from '@/modules/billing/service';
import { DomainError } from '@/modules/errors';
import { assertOwnMedia } from '@/modules/media/service';
import type { BranchInput, BusinessProfileInput, OnboardingInput } from './schema';

const MAX_OWNED_BUSINESSES = 5;

function coordinates(city: string, latitude?: number | null, longitude?: number | null) {
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return { lat: Math.round(latitude * 1e6), lon: Math.round(longitude * 1e6) };
  }
  const center = getCity(city)!;
  return { lat: Math.round(center.latitude * 1e6), lon: Math.round(center.longitude * 1e6) };
}

export async function createBusiness(db: D1Database, input: { userId: string; data: OnboardingInput; locale: 'uz' | 'ru' }, now = new Date()) {
  const owned = await db
    .prepare(`SELECT COUNT(*) AS n FROM business_members m JOIN businesses b ON b.id = m.business_id
      WHERE m.user_id = ?1 AND m.role = 'OWNER' AND m.revoked_at IS NULL AND b.deleted_at IS NULL`)
    .bind(input.userId)
    .first<{ n: number }>();
  if ((owned?.n ?? 0) >= MAX_OWNED_BUSINESSES) throw new DomainError('BUSINESS_LIMIT');
  const category = await db.prepare(`SELECT id FROM categories WHERE id = ?1 AND is_active = 1`).bind(input.data.categoryId).first();
  if (!category) throw new DomainError('VALIDATION');

  const { data } = input;
  const id = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const slug = `${slugify(data.name, 'biznes')}-${id.slice(0, 6)}`;
  const nowDb = toDbTime(now);
  const point = coordinates(data.city, data.latitude, data.longitude);
  await db.batch([
    db.prepare(`INSERT INTO businesses(id, slug, name, description, city, category_id, phone, telegram, instagram, website,
        verification_status, submitted_at, search_text, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'PENDING', ?11, ?12, ?11, ?11)`)
      .bind(id, slug, data.name, data.description, data.city, data.categoryId, data.phone, data.telegram ?? null, data.instagram ?? null,
        data.website ?? null, nowDb, buildSearchText(data.name, data.description)),
    db.prepare(`INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, phone, working_hours_json, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`)
      .bind(branchId, id, input.locale === 'ru' ? 'Основной филиал' : 'Asosiy filial', data.city, data.address, point.lat, point.lon, data.phone,
        serializeHours({ open: '09:00', close: '21:00' }), nowDb),
    db.prepare(`INSERT INTO business_members(business_id, user_id, role, created_at) VALUES (?1, ?2, 'OWNER', ?3)`).bind(id, input.userId, nowDb),
    auditStatement(db, { actorUserId: input.userId, businessId: id, action: 'business.submitted', targetType: 'Business', targetId: id, after: { name: data.name, status: 'PENDING' } }, nowDb),
  ]);
  return { id, slug };
}

export async function updateBusinessProfile(db: D1Database, input: { businessId: string; userId: string; data: BusinessProfileInput; resubmit: boolean }, now = new Date()) {
  const current = await db
    .prepare(`SELECT name, verification_status AS status FROM businesses WHERE id = ?1 AND deleted_at IS NULL`)
    .bind(input.businessId)
    .first<{ name: string; status: string }>();
  if (!current) throw new DomainError('NOT_FOUND');
  const category = await db.prepare(`SELECT id FROM categories WHERE id = ?1`).bind(input.data.categoryId).first();
  if (!category) throw new DomainError('VALIDATION');
  const { data } = input;
  await assertOwnMedia(db, input.businessId, data.logoId);
  await assertOwnMedia(db, input.businessId, data.coverId);
  const resubmit = input.resubmit && current.status === 'REJECTED';
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE businesses SET name = ?2, description = ?3, category_id = ?4, city = ?5, phone = ?6, telegram = ?7, instagram = ?8,
        website = ?9, search_text = ?10, updated_at = ?11,
        verification_status = CASE WHEN ?12 = 1 THEN 'PENDING' ELSE verification_status END,
        rejection_reason = CASE WHEN ?12 = 1 THEN NULL ELSE rejection_reason END,
        submitted_at = CASE WHEN ?12 = 1 THEN ?11 ELSE submitted_at END,
        logo_id = CASE WHEN ?13 = 1 THEN ?14 ELSE logo_id END,
        cover_id = CASE WHEN ?15 = 1 THEN ?16 ELSE cover_id END
      WHERE id = ?1`)
      .bind(input.businessId, data.name, data.description, data.categoryId, data.city, data.phone, data.telegram ?? null, data.instagram ?? null,
        data.website ?? null, buildSearchText(data.name, data.description), nowDb, resubmit ? 1 : 0,
        data.logoId === undefined ? 0 : 1, data.logoId ?? null, data.coverId === undefined ? 0 : 1, data.coverId ?? null),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: resubmit ? 'business.resubmitted' : 'business.updated', targetType: 'Business', targetId: input.businessId, before: { name: current.name, status: current.status }, after: { name: data.name } }, nowDb),
  ]);
}

export type BranchRow = { id: string; name: string; city: string; address: string; phone: string | null; latitude: number; longitude: number; hoursJson: string; activeDeals: number };

export async function listBranches(db: D1Database, businessId: string, now = new Date()): Promise<BranchRow[]> {
  const rows = await db
    .prepare(`SELECT br.id, br.name, br.city, br.address, br.phone, br.latitude_e6 AS lat, br.longitude_e6 AS lon, br.working_hours_json AS hoursJson,
        (SELECT COUNT(*) FROM deal_branches db JOIN deals d ON d.id = db.deal_id
          WHERE db.branch_id = br.id AND d.deleted_at IS NULL AND d.status IN ('PENDING_REVIEW', 'ACTIVE', 'PAUSED') AND d.ends_at > ?2) AS activeDeals
      FROM branches br WHERE br.business_id = ?1 AND br.deleted_at IS NULL ORDER BY br.created_at, br.name`)
    .bind(businessId, toDbTime(now))
    .all<Omit<BranchRow, 'latitude' | 'longitude'> & { lat: number; lon: number }>();
  return rows.results.map(({ lat, lon, ...row }) => ({ ...row, latitude: lat / 1e6, longitude: lon / 1e6 }));
}

export async function createBranch(db: D1Database, input: { businessId: string; userId: string; data: BranchInput }, now = new Date()) {
  await assertWithinLimit(db, input.businessId, 'branches', now);
  const id = crypto.randomUUID();
  const nowDb = toDbTime(now);
  const point = coordinates(input.data.city, input.data.latitude, input.data.longitude);
  await db.batch([
    db.prepare(`INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, phone, working_hours_json, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`)
      .bind(id, input.businessId, input.data.name, input.data.city, input.data.address, point.lat, point.lon, input.data.phone ?? null,
        serializeHours({ open: input.data.open, close: input.data.close }), nowDb),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'branch.created', targetType: 'Branch', targetId: id, after: { name: input.data.name } }, nowDb),
  ]);
  return { id };
}

export async function updateBranch(db: D1Database, input: { businessId: string; userId: string; branchId: string; data: BranchInput }, now = new Date()) {
  const nowDb = toDbTime(now);
  const hasPoint = typeof input.data.latitude === 'number' && typeof input.data.longitude === 'number';
  const point = coordinates(input.data.city, input.data.latitude, input.data.longitude);
  const results = await db.batch([
    db.prepare(`UPDATE branches SET name = ?3, city = ?4, address = ?5, phone = ?6, working_hours_json = ?7, updated_at = ?8,
        latitude_e6 = CASE WHEN ?9 = 1 OR city != ?4 THEN ?10 ELSE latitude_e6 END,
        longitude_e6 = CASE WHEN ?9 = 1 OR city != ?4 THEN ?11 ELSE longitude_e6 END
      WHERE id = ?1 AND business_id = ?2 AND deleted_at IS NULL`)
      .bind(input.branchId, input.businessId, input.data.name, input.data.city, input.data.address, input.data.phone ?? null,
        serializeHours({ open: input.data.open, close: input.data.close }), nowDb, hasPoint ? 1 : 0, point.lat, point.lon),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'branch.updated', targetType: 'Branch', targetId: input.branchId, after: { name: input.data.name } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
}

export async function deleteBranch(db: D1Database, input: { businessId: string; userId: string; branchId: string }, now = new Date()) {
  const branches = await listBranches(db, input.businessId, now);
  const branch = branches.find((item) => item.id === input.branchId);
  if (!branch) throw new DomainError('NOT_FOUND');
  if (branches.length <= 1) throw new DomainError('LAST_BRANCH');
  if (branch.activeDeals > 0) throw new DomainError('BRANCH_IN_USE');
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE branches SET deleted_at = ?3, updated_at = ?3 WHERE id = ?1 AND business_id = ?2`).bind(input.branchId, input.businessId, nowDb),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'branch.deleted', targetType: 'Branch', targetId: input.branchId }, nowDb),
  ]);
}

export type MemberRow = { userId: string; displayName: string; phone: string | null; role: BusinessRole; createdAt: string };

export async function listMembers(db: D1Database, businessId: string): Promise<MemberRow[]> {
  const rows = await db
    .prepare(`SELECT m.user_id AS userId, u.display_name AS displayName, u.phone, m.role, m.created_at AS createdAt
      FROM business_members m JOIN users u ON u.id = m.user_id
      WHERE m.business_id = ?1 AND m.revoked_at IS NULL
      ORDER BY CASE m.role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END, u.display_name`)
    .bind(businessId)
    .all<MemberRow>();
  return rows.results;
}

export async function addMember(db: D1Database, input: { businessId: string; userId: string; phone: string; role: BusinessRole }, now = new Date()) {
  const target = await getUserByPhone(db, input.phone);
  if (!target || target.status !== 'ACTIVE') throw new DomainError('USER_NOT_FOUND');
  const existing = await db
    .prepare(`SELECT revoked_at AS revokedAt FROM business_members WHERE business_id = ?1 AND user_id = ?2`)
    .bind(input.businessId, target.id)
    .first<{ revokedAt: string | null }>();
  if (existing && !existing.revokedAt) throw new DomainError('ALREADY_MEMBER');
  await assertWithinLimit(db, input.businessId, 'staff', now);
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`INSERT INTO business_members(business_id, user_id, role, created_at, added_by_user_id) VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(business_id, user_id) DO UPDATE SET role = excluded.role, revoked_at = NULL, created_at = excluded.created_at, added_by_user_id = excluded.added_by_user_id`)
      .bind(input.businessId, target.id, input.role, nowDb, input.userId),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'team.added', targetType: 'User', targetId: target.id, after: { role: input.role, phone: maskPhone(input.phone) } }, nowDb),
  ]);
  return { userId: target.id, displayName: target.displayName };
}

export async function changeMemberRole(db: D1Database, input: { businessId: string; userId: string; memberId: string; role: BusinessRole }, now = new Date()) {
  if (input.memberId === input.userId) throw new DomainError('SELF_ACTION');
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`UPDATE business_members SET role = ?3 WHERE business_id = ?1 AND user_id = ?2 AND revoked_at IS NULL`).bind(input.businessId, input.memberId, input.role),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'team.role_changed', targetType: 'User', targetId: input.memberId, after: { role: input.role } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
}

export async function removeMember(db: D1Database, input: { businessId: string; userId: string; memberId: string }, now = new Date()) {
  if (input.memberId === input.userId) throw new DomainError('SELF_ACTION');
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`UPDATE business_members SET revoked_at = ?3 WHERE business_id = ?1 AND user_id = ?2 AND revoked_at IS NULL`).bind(input.businessId, input.memberId, nowDb),
    auditStatement(db, { actorUserId: input.userId, businessId: input.businessId, action: 'team.removed', targetType: 'User', targetId: input.memberId }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('NOT_FOUND');
}

export type DashboardData = {
  live: number; pending: number; claimsToday: number; redeemedToday: number; views: number;
  followers: number; ratingBp: number; reviewCount: number;
  recent: Array<{ id: string; status: string; createdAt: string; completedAt: string | null; dealTitle: string; customerName: string; branchName: string }>;
};

export async function businessDashboard(db: D1Database, businessId: string, now = new Date()): Promise<DashboardData> {
  const nowDb = toDbTime(now);
  const dayStart = toDbTime(startOfTashkentDay(now));
  const [counts, recent] = await Promise.all([
    db.prepare(`SELECT
        (SELECT COUNT(*) FROM deals WHERE business_id = ?1 AND deleted_at IS NULL AND status = 'ACTIVE' AND starts_at <= ?2 AND ends_at > ?2
          AND (remaining_quantity IS NULL OR remaining_quantity > 0)) AS live,
        (SELECT COUNT(*) FROM deals WHERE business_id = ?1 AND deleted_at IS NULL AND status = 'PENDING_REVIEW') AS pending,
        (SELECT COUNT(*) FROM redemptions WHERE business_id = ?1 AND created_at >= ?3) AS claimsToday,
        (SELECT COUNT(*) FROM redemptions WHERE business_id = ?1 AND status = 'COMPLETED' AND completed_at >= ?3) AS redeemedToday,
        (SELECT COALESCE(SUM(view_count), 0) FROM deals WHERE business_id = ?1 AND deleted_at IS NULL) AS views,
        (SELECT COUNT(*) FROM follows WHERE business_id = ?1) AS followers,
        (SELECT rating_basis_points FROM businesses WHERE id = ?1) AS ratingBp,
        (SELECT review_count FROM businesses WHERE id = ?1) AS reviewCount`)
      .bind(businessId, nowDb, dayStart)
      .first<Omit<DashboardData, 'recent'>>(),
    db.prepare(`SELECT r.id, CASE WHEN r.status = 'CLAIMED' AND r.expires_at <= ?2 THEN 'EXPIRED' ELSE r.status END AS status,
        r.created_at AS createdAt, r.completed_at AS completedAt, d.title AS dealTitle,
        u.display_name AS customerName, br.name AS branchName
      FROM redemptions r JOIN deals d ON d.id = r.deal_id JOIN users u ON u.id = r.user_id JOIN branches br ON br.id = r.branch_id
      WHERE r.business_id = ?1 ORDER BY r.created_at DESC LIMIT 10`)
      .bind(businessId, nowDb)
      .all<DashboardData['recent'][number]>(),
  ]);
  return {
    live: counts?.live ?? 0,
    pending: counts?.pending ?? 0,
    claimsToday: counts?.claimsToday ?? 0,
    redeemedToday: counts?.redeemedToday ?? 0,
    views: counts?.views ?? 0,
    followers: counts?.followers ?? 0,
    ratingBp: counts?.ratingBp ?? 0,
    reviewCount: counts?.reviewCount ?? 0,
    recent: recent.results,
  };
}

export async function redeemedToday(db: D1Database, businessId: string, now = new Date()) {
  const rows = await db
    .prepare(`SELECT r.id, r.completed_at AS completedAt, d.title AS dealTitle, u.display_name AS customerName, br.name AS branchName,
        d.discounted_price_uzs AS price
      FROM redemptions r JOIN deals d ON d.id = r.deal_id JOIN users u ON u.id = r.user_id JOIN branches br ON br.id = r.branch_id
      WHERE r.business_id = ?1 AND r.status = 'COMPLETED' AND r.completed_at >= ?2
      ORDER BY r.completed_at DESC LIMIT 50`)
    .bind(businessId, toDbTime(startOfTashkentDay(now)))
    .all<{ id: string; completedAt: string; dealTitle: string; customerName: string; branchName: string; price: number }>();
  return rows.results;
}
