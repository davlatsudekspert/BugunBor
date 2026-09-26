import { dealPhotoUrl } from '@/lib/photos';
import { buildSearchText, slugify } from '@/lib/search';
import { addMinutes, parseDbTime, tashkentInputToDate, toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { assertWithinLimit, loadSubscription } from '@/modules/billing/service';
import { DomainError } from '@/modules/errors';
import { assertOwnMedia } from '@/modules/media/service';
import type { DealInput } from './schema';
import { discountPercent, effectiveDealStatus, type EffectiveDealStatus, type StoredDealStatus } from './status';

const randomSuffix = () => crypto.randomUUID().replaceAll('-', '').slice(0, 6);

export type BusinessDealRow = {
  id: string; slug: string; title: string; status: StoredDealStatus; startsAt: string; endsAt: string;
  originalPrice: number | null; price: number; discountPercent: number; total: number | null; remaining: number | null;
  visual: string | null; photo: string | null; categorySlug: string; viewCount: number; isSponsored: boolean; rejectionReason: string | null;
  claims: number; redeemed: number; effective: EffectiveDealStatus;
  /** Why the automatic check held it back, if it did. */
  autoNote: string | null;
};

export async function listBusinessDeals(db: D1Database, businessId: string, now = new Date()): Promise<BusinessDealRow[]> {
  const rows = await db
    .prepare(`SELECT d.id, d.slug, d.title, d.status, d.starts_at AS startsAt, d.ends_at AS endsAt,
        d.original_price_uzs AS originalPrice, d.discounted_price_uzs AS price, d.discount_percent AS discountPercent,
        d.total_quantity AS total, d.remaining_quantity AS remaining, d.visual, c.slug AS categorySlug,
        d.view_count AS viewCount, d.is_sponsored AS isSponsored, d.rejection_reason AS rejectionReason,
        d.photo_id AS photoId, d.is_demo AS isDemo, d.auto_review_note AS autoNote,
        (SELECT COUNT(*) FROM redemptions r WHERE r.deal_id = d.id) AS claims,
        (SELECT COUNT(*) FROM redemptions r WHERE r.deal_id = d.id AND r.status = 'COMPLETED') AS redeemed
      FROM deals d JOIN categories c ON c.id = d.category_id
      WHERE d.business_id = ?1 AND d.deleted_at IS NULL
      ORDER BY CASE d.status WHEN 'PENDING_REVIEW' THEN 0 WHEN 'ACTIVE' THEN 1 WHEN 'PAUSED' THEN 2 WHEN 'DRAFT' THEN 3 WHEN 'REJECTED' THEN 4 ELSE 5 END,
        d.ends_at DESC`)
    .bind(businessId)
    .all<Omit<BusinessDealRow, 'effective' | 'isSponsored' | 'photo'> & { isSponsored: number; photoId: string | null; isDemo: number }>();
  return rows.results.map(({ photoId, isDemo, ...row }) => ({
    ...row,
    photo: dealPhotoUrl({ photoId, isDemo, visual: row.visual, slug: row.slug }),
    isSponsored: Boolean(row.isSponsored),
    effective: effectiveDealStatus({ status: row.status, startsAt: row.startsAt, endsAt: row.endsAt, remainingQuantity: row.remaining }, now),
  }));
}

export type EditableDeal = {
  id: string; status: StoredDealStatus; title: string; description: string; terms: string; categoryId: string; visual: string | null;
  originalPrice: number | null; price: number; startsAt: string; endsAt: string; total: number | null; perCustomerLimit: number;
  claimTtlMinutes: number; branchIds: string[]; rejectionReason: string | null; slug: string; isSponsored: boolean; photoId: string | null;
};

export async function getBusinessDeal(db: D1Database, businessId: string, dealId: string): Promise<EditableDeal> {
  const deal = await db
    .prepare(`SELECT id, status, title, description, terms, category_id AS categoryId, visual, original_price_uzs AS originalPrice,
        discounted_price_uzs AS price, starts_at AS startsAt, ends_at AS endsAt, total_quantity AS total,
        per_customer_limit AS perCustomerLimit, claim_ttl_minutes AS claimTtlMinutes, rejection_reason AS rejectionReason, slug,
        is_sponsored AS isSponsored, photo_id AS photoId
      FROM deals WHERE id = ?1 AND business_id = ?2 AND deleted_at IS NULL`)
    .bind(dealId, businessId)
    .first<Omit<EditableDeal, 'branchIds' | 'isSponsored'> & { isSponsored: number }>();
  if (!deal) throw new DomainError('NOT_FOUND');
  const branches = await db.prepare(`SELECT branch_id AS id FROM deal_branches WHERE deal_id = ?1`).bind(dealId).all<{ id: string }>();
  return { ...deal, isSponsored: Boolean(deal.isSponsored), branchIds: branches.results.map((row) => row.id) };
}

async function assertBranchesBelong(db: D1Database, businessId: string, branchIds: string[]) {
  const unique = [...new Set(branchIds)];
  const placeholders = unique.map((_, index) => `?${index + 2}`).join(', ');
  const found = await db
    .prepare(`SELECT COUNT(*) AS n FROM branches WHERE business_id = ?1 AND deleted_at IS NULL AND id IN (${placeholders})`)
    .bind(businessId, ...unique)
    .first<{ n: number }>();
  if ((found?.n ?? 0) !== unique.length) throw new DomainError('VALIDATION');
  return unique;
}

async function assertCategory(db: D1Database, categoryId: string) {
  const category = await db.prepare(`SELECT id FROM categories WHERE id = ?1 AND is_active = 1`).bind(categoryId).first();
  if (!category) throw new DomainError('VALIDATION');
}

function dealColumns(input: DealInput) {
  const startsAt = tashkentInputToDate(input.startsAt)!;
  const endsAt = tashkentInputToDate(input.endsAt)!;
  return {
    startsAt: toDbTime(startsAt),
    endsAt: toDbTime(endsAt),
    percent: discountPercent(input.originalPrice, input.price),
    searchText: buildSearchText(input.title, input.description),
  };
}

type Actor = { businessId: string; userId: string };

async function assertCanSubmit(db: D1Database, actor: Actor, endsAt: string, now: Date) {
  if (endsAt <= toDbTime(now)) throw new DomainError('END_IN_PAST', 422);
  const subscription = await loadSubscription(db, actor.businessId, now);
  if (subscription.status === 'EXPIRED') throw new DomainError('SUBSCRIPTION_EXPIRED');
  await assertWithinLimit(db, actor.businessId, 'liveDeals', now);
}

export async function createDeal(db: D1Database, actor: Actor & { input: DealInput; submit: boolean }, now = new Date()) {
  const { input } = actor;
  await assertCategory(db, input.categoryId);
  const branchIds = await assertBranchesBelong(db, actor.businessId, input.branchIds);
  await assertOwnMedia(db, actor.businessId, input.photoId);
  const columns = dealColumns(input);
  if (actor.submit) await assertCanSubmit(db, actor, columns.endsAt, now);
  const id = crypto.randomUUID();
  const nowDb = toDbTime(now);
  const status: StoredDealStatus = actor.submit ? 'PENDING_REVIEW' : 'DRAFT';
  await db.batch([
    db.prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs,
        discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status,
        created_by_id, claim_ttl_minutes, visual, search_text, submitted_at, created_at, updated_at, photo_id)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14, 'ONSITE_CODE', ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?21, ?22)`)
      .bind(id, actor.businessId, input.categoryId, `${slugify(input.title, 'aksiya')}-${randomSuffix()}`, input.title, input.description, input.terms,
        input.originalPrice, input.price, columns.percent, columns.startsAt, columns.endsAt, input.quantity, input.perCustomerLimit, status,
        actor.userId, input.claimTtlMinutes, input.visual, columns.searchText, actor.submit ? nowDb : null, nowDb, input.photoId ?? null),
    ...branchIds.map((branchId) => db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES (?1, ?2)`).bind(id, branchId)),
    auditStatement(db, { actorUserId: actor.userId, businessId: actor.businessId, action: actor.submit ? 'deal.submitted' : 'deal.created', targetType: 'Deal', targetId: id, after: { status, title: input.title } }, nowDb),
  ]);
  return { id, status };
}

export async function updateDeal(db: D1Database, actor: Actor & { dealId: string; input: DealInput; submit: boolean }, now = new Date()) {
  const current = await getBusinessDeal(db, actor.businessId, actor.dealId);
  if (current.status !== 'DRAFT' && current.status !== 'REJECTED') throw new DomainError('INVALID_TRANSITION');
  const { input } = actor;
  await assertCategory(db, input.categoryId);
  const branchIds = await assertBranchesBelong(db, actor.businessId, input.branchIds);
  await assertOwnMedia(db, actor.businessId, input.photoId);
  const columns = dealColumns(input);
  if (actor.submit) await assertCanSubmit(db, actor, columns.endsAt, now);
  const nowDb = toDbTime(now);
  const status: StoredDealStatus = actor.submit ? 'PENDING_REVIEW' : current.status;
  const results = await db.batch([
    db.prepare(`UPDATE deals SET category_id = ?3, title = ?4, description = ?5, terms = ?6, original_price_uzs = ?7, discounted_price_uzs = ?8,
        discount_percent = ?9, starts_at = ?10, ends_at = ?11, total_quantity = ?12, remaining_quantity = ?12, per_customer_limit = ?13,
        claim_ttl_minutes = ?14, visual = ?15, search_text = ?16, status = ?17, submitted_at = CASE WHEN ?17 = 'PENDING_REVIEW' THEN ?18 ELSE submitted_at END,
        updated_at = ?18, photo_id = CASE WHEN ?19 = 1 THEN ?20 ELSE photo_id END
      WHERE id = ?1 AND business_id = ?2 AND status IN ('DRAFT', 'REJECTED') AND deleted_at IS NULL`)
      .bind(actor.dealId, actor.businessId, input.categoryId, input.title, input.description, input.terms, input.originalPrice, input.price,
        columns.percent, columns.startsAt, columns.endsAt, input.quantity, input.perCustomerLimit, input.claimTtlMinutes, input.visual,
        columns.searchText, status, nowDb, input.photoId === undefined ? 0 : 1, input.photoId ?? null),
    db.prepare(`DELETE FROM deal_branches WHERE deal_id = ?1`).bind(actor.dealId),
    ...branchIds.map((branchId) => db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES (?1, ?2)`).bind(actor.dealId, branchId)),
    auditStatement(db, { actorUserId: actor.userId, businessId: actor.businessId, action: actor.submit ? 'deal.submitted' : 'deal.updated', targetType: 'Deal', targetId: actor.dealId, before: { status: current.status }, after: { status } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  return { id: actor.dealId, status };
}

export type DealAction = 'submit' | 'withdraw' | 'pause' | 'resume' | 'end' | 'delete';

const transitions: Record<DealAction, { from: StoredDealStatus[]; to: StoredDealStatus | 'DELETED' }> = {
  submit: { from: ['DRAFT', 'REJECTED'], to: 'PENDING_REVIEW' },
  withdraw: { from: ['PENDING_REVIEW'], to: 'DRAFT' },
  pause: { from: ['ACTIVE'], to: 'PAUSED' },
  resume: { from: ['PAUSED'], to: 'ACTIVE' },
  end: { from: ['ACTIVE', 'PAUSED'], to: 'ARCHIVED' },
  delete: { from: ['DRAFT', 'REJECTED'], to: 'DELETED' },
};

export async function transitionDeal(db: D1Database, actor: Actor & { dealId: string; action: DealAction }, now = new Date()) {
  const current = await getBusinessDeal(db, actor.businessId, actor.dealId);
  const rule = transitions[actor.action];
  if (!rule.from.includes(current.status)) throw new DomainError('INVALID_TRANSITION');
  if (actor.action === 'submit') await assertCanSubmit(db, actor, current.endsAt, now);
  if (actor.action === 'resume') {
    if (current.endsAt <= toDbTime(now)) throw new DomainError('DEAL_EXPIRED');
    await assertWithinLimit(db, actor.businessId, 'liveDeals', now);
  }
  const nowDb = toDbTime(now);
  const allowed = rule.from.map((status) => `'${status}'`).join(', ');
  const update =
    rule.to === 'DELETED'
      ? db.prepare(`UPDATE deals SET deleted_at = ?3, updated_at = ?3 WHERE id = ?1 AND business_id = ?2 AND status IN (${allowed}) AND deleted_at IS NULL`).bind(actor.dealId, actor.businessId, nowDb)
      : db.prepare(`UPDATE deals SET status = ?3, updated_at = ?4,
            submitted_at = CASE WHEN ?3 = 'PENDING_REVIEW' THEN ?4 ELSE submitted_at END,
            archived_at = CASE WHEN ?3 = 'ARCHIVED' THEN ?4 ELSE archived_at END,
            is_sponsored = CASE WHEN ?3 = 'ARCHIVED' THEN 0 ELSE is_sponsored END
          WHERE id = ?1 AND business_id = ?2 AND status IN (${allowed}) AND deleted_at IS NULL`).bind(actor.dealId, actor.businessId, rule.to, nowDb);
  const results = await db.batch([
    update,
    auditStatement(db, { actorUserId: actor.userId, businessId: actor.businessId, action: `deal.${actor.action}`, targetType: 'Deal', targetId: actor.dealId, before: { status: current.status }, after: { status: rule.to } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
  return { status: rule.to };
}

/** Copies any deal into a new draft that starts at the next quarter hour with the same duration. */
export async function duplicateDeal(db: D1Database, actor: Actor & { dealId: string }, now = new Date()) {
  const source = await getBusinessDeal(db, actor.businessId, actor.dealId);
  const duration = Math.min(parseDbTime(source.endsAt).getTime() - parseDbTime(source.startsAt).getTime(), 30 * 86_400_000);
  const start = new Date(Math.ceil(now.getTime() / 900_000) * 900_000);
  const end = new Date(start.getTime() + Math.max(duration, 60 * 60_000));
  const id = crypto.randomUUID();
  const nowDb = toDbTime(now);
  const branches = await db
    .prepare(`SELECT db.branch_id AS id FROM deal_branches db JOIN branches br ON br.id = db.branch_id WHERE db.deal_id = ?1 AND br.deleted_at IS NULL`)
    .bind(actor.dealId)
    .all<{ id: string }>();
  await db.batch([
    db.prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs,
        discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status,
        created_by_id, claim_ttl_minutes, visual, search_text, created_at, updated_at, photo_id)
      SELECT ?1, business_id, category_id, ?3, title, description, terms, original_price_uzs, discounted_price_uzs,
        discount_percent, ?4, ?5, total_quantity, total_quantity, per_customer_limit, 'ONSITE_CODE', 'DRAFT',
        ?6, claim_ttl_minutes, visual, search_text, ?7, ?7, photo_id
      FROM deals WHERE id = ?2 AND business_id = ?8`)
      .bind(id, actor.dealId, `${slugify(source.title, 'aksiya')}-${randomSuffix()}`, toDbTime(start), toDbTime(end), actor.userId, nowDb, actor.businessId),
    ...branches.results.map((branch) => db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES (?1, ?2)`).bind(id, branch.id)),
    auditStatement(db, { actorUserId: actor.userId, businessId: actor.businessId, action: 'deal.duplicated', targetType: 'Deal', targetId: id, after: { from: actor.dealId } }, nowDb),
  ]);
  return { id };
}

/** "TOP" placement: sponsored deals are listed first, within the plan's slots. */
export async function setDealTop(db: D1Database, actor: Actor & { dealId: string; on: boolean }, now = new Date()) {
  const current = await getBusinessDeal(db, actor.businessId, actor.dealId);
  if (!['ACTIVE', 'PAUSED', 'PENDING_REVIEW'].includes(current.status)) throw new DomainError('INVALID_TRANSITION');
  if (actor.on) await assertWithinLimit(db, actor.businessId, 'topSlots', now);
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE deals SET is_sponsored = ?3, updated_at = ?4 WHERE id = ?1 AND business_id = ?2`).bind(actor.dealId, actor.businessId, actor.on ? 1 : 0, nowDb),
    auditStatement(db, { actorUserId: actor.userId, businessId: actor.businessId, action: actor.on ? 'deal.top_on' : 'deal.top_off', targetType: 'Deal', targetId: actor.dealId }, nowDb),
  ]);
}

/** A new deal starts right away (live as soon as it is approved) and runs four hours. */
export function defaultDealWindow(now = new Date()) {
  const start = new Date(Math.floor(now.getTime() / 300_000) * 300_000);
  return { start, end: addMinutes(start, 4 * 60) };
}
