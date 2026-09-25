import { distanceKm } from '@/lib/cities';
import { dealPhotoUrl, mediaUrl } from '@/lib/photos';
import { searchPattern } from '@/lib/search';
import { toDbTime } from '@/lib/time';
import { PUBLIC_BUSINESS_SQL, effectiveDealStatus, liveDealSql, subscriptionActiveSql, type EffectiveDealStatus } from '@/modules/deals/status';

export type SortKey = 'ending' | 'discount' | 'new' | 'near';
export const SORT_KEYS: readonly SortKey[] = ['ending', 'discount', 'new', 'near'];

export type BranchSummary = {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  hoursJson: string;
};

/** Average rating in basis points (470 = 4.7) and how many ratings it is based on. */
export type Rating = { basisPoints: number; count: number };

const rating = (basisPoints: number | null, count: number | null): Rating | null => (count ? { basisPoints: basisPoints ?? 0, count } : null);

export type DealCard = {
  id: string;
  slug: string;
  title: string;
  originalPrice: number | null;
  price: number;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  remaining: number | null;
  total: number | null;
  visual: string | null;
  /** Cover photo URL, or null to draw the visual. */
  photo: string | null;
  categorySlug: string;
  claimTtlMinutes: number;
  publishedAt: string;
  isSponsored: boolean;
  business: { id: string; slug: string; name: string; logo: string | null; rating: Rating | null };
  branch: BranchSummary;
  branchCount: number;
  distanceKm: number | null;
  effective: EffectiveDealStatus;
};

type DealBranchRow = {
  id: string; slug: string; title: string; originalPrice: number | null; price: number; discountPercent: number;
  startsAt: string; endsAt: string; remaining: number | null; total: number | null; visual: string | null;
  publishedAt: string; isSponsored: number; claimTtlMinutes: number; status: string; categorySlug: string;
  businessId: string; businessSlug: string; businessName: string; logoId: string | null; photoId: string | null; isDemo: number;
  ratingBp: number | null; reviewCount: number | null;
  branchId: string; branchName: string; address: string; city: string; lat: number; lon: number; hoursJson: string;
};

const DEAL_BRANCH_COLUMNS = `d.id, d.slug, d.title, d.original_price_uzs AS originalPrice, d.discounted_price_uzs AS price,
  d.discount_percent AS discountPercent, d.starts_at AS startsAt, d.ends_at AS endsAt,
  d.remaining_quantity AS remaining, d.total_quantity AS total, d.visual, d.status,
  COALESCE(d.approved_at, d.created_at) AS publishedAt, d.is_sponsored AS isSponsored, d.claim_ttl_minutes AS claimTtlMinutes,
  c.slug AS categorySlug, b.id AS businessId, b.slug AS businessSlug, b.name AS businessName,
  b.logo_id AS logoId, d.photo_id AS photoId, d.is_demo AS isDemo, b.rating_basis_points AS ratingBp, b.review_count AS reviewCount,
  br.id AS branchId, br.name AS branchName, br.address, br.city, br.latitude_e6 AS lat, br.longitude_e6 AS lon, br.working_hours_json AS hoursJson`;

type Point = { latitude: number; longitude: number };

function groupDeals(rows: DealBranchRow[], near: Point | null, now: Date): DealCard[] {
  const grouped = new Map<string, DealCard>();
  for (const row of rows) {
    const branch: BranchSummary = { id: row.branchId, name: row.branchName, address: row.address, city: row.city, latitude: row.lat / 1e6, longitude: row.lon / 1e6, hoursJson: row.hoursJson };
    const distance = near ? distanceKm(near, branch) : null;
    const current = grouped.get(row.id);
    if (current) {
      current.branchCount += 1;
      const closer = distance !== null && current.distanceKm !== null && distance < current.distanceKm;
      const earlierName = distance === null && branch.name.localeCompare(current.branch.name) < 0;
      if (closer || earlierName) {
        current.branch = branch;
        current.distanceKm = distance;
      }
      continue;
    }
    grouped.set(row.id, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      originalPrice: row.originalPrice,
      price: row.price,
      discountPercent: row.discountPercent,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      remaining: row.remaining,
      total: row.total,
      visual: row.visual,
      photo: dealPhotoUrl(row),
      categorySlug: row.categorySlug,
      claimTtlMinutes: row.claimTtlMinutes,
      publishedAt: row.publishedAt,
      isSponsored: Boolean(row.isSponsored),
      business: { id: row.businessId, slug: row.businessSlug, name: row.businessName, logo: mediaUrl(row.logoId), rating: rating(row.ratingBp, row.reviewCount) },
      branch,
      branchCount: 1,
      distanceKm: distance,
      effective: effectiveDealStatus({ status: row.status, startsAt: row.startsAt, endsAt: row.endsAt, remainingQuantity: row.remaining }, now),
    });
  }
  return [...grouped.values()];
}

function sortDeals(deals: DealCard[], sort: SortKey) {
  const byEnding = (a: DealCard, b: DealCard) => a.endsAt.localeCompare(b.endsAt);
  const comparators: Record<SortKey, (a: DealCard, b: DealCard) => number> = {
    ending: (a, b) => Number(b.isSponsored) - Number(a.isSponsored) || byEnding(a, b),
    discount: (a, b) => b.discountPercent - a.discountPercent || byEnding(a, b),
    new: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
    near: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || byEnding(a, b),
  };
  return deals.sort(comparators[sort]);
}

export type DealFilters = {
  city?: string | null;
  category?: string | null;
  query?: string | null;
  sort?: SortKey;
  near?: Point | null;
  demo: boolean;
  now?: Date;
};

/** All claimable deals matching the filters, one card per deal. */
export async function listLiveDeals(db: D1Database, filters: DealFilters) {
  const now = filters.now ?? new Date();
  const rows = await db
    .prepare(`SELECT ${DEAL_BRANCH_COLUMNS}
      FROM deals d
      JOIN businesses b ON b.id = d.business_id
      JOIN categories c ON c.id = d.category_id
      JOIN deal_branches db ON db.deal_id = d.id
      JOIN branches br ON br.id = db.branch_id AND br.deleted_at IS NULL
      WHERE ${liveDealSql('?1')}
        AND (?2 = 1 OR d.is_demo = 0)
        AND (?3 IS NULL OR br.city = ?3)
        AND (?4 IS NULL OR c.slug = ?4)
        AND (?5 IS NULL OR d.search_text LIKE ?5 OR b.search_text LIKE ?5)
      LIMIT 2000`)
    .bind(toDbTime(now), filters.demo ? 1 : 0, filters.city ?? null, filters.category ?? null, searchPattern(filters.query))
    .all<DealBranchRow>();
  const near = filters.near ?? null;
  const sort = filters.sort === 'near' && !near ? 'ending' : (filters.sort ?? 'ending');
  return sortDeals(groupDeals(rows.results, near, now), sort);
}

export type Category = { id: string; slug: string; nameUz: string; nameRu: string | null; icon: string | null; sortOrder: number; isActive: boolean };

export async function listCategories(db: D1Database, options: { includeInactive?: boolean } = {}) {
  const rows = await db
    .prepare(`SELECT id, slug, name_uz AS nameUz, name_ru AS nameRu, icon, sort_order AS sortOrder, is_active AS isActive
      FROM categories WHERE (?1 = 1 OR is_active = 1) ORDER BY sort_order, name_uz`)
    .bind(options.includeInactive ? 1 : 0)
    .all<Omit<Category, 'isActive'> & { isActive: number }>();
  return rows.results.map((row) => ({ ...row, isActive: Boolean(row.isActive) }));
}

export function categoryName(category: Pick<Category, 'nameUz' | 'nameRu'>, locale: 'uz' | 'ru') {
  return locale === 'ru' ? (category.nameRu ?? category.nameUz) : category.nameUz;
}

export function countByCategory(deals: DealCard[]) {
  const counts = new Map<string, number>();
  for (const deal of deals) counts.set(deal.categorySlug, (counts.get(deal.categorySlug) ?? 0) + 1);
  return counts;
}

export type DealDetail = {
  id: string; slug: string; title: string; description: string; terms: string;
  originalPrice: number | null; price: number; discountPercent: number;
  startsAt: string; endsAt: string; remaining: number | null; total: number | null;
  perCustomerLimit: number; claimTtlMinutes: number; visual: string | null; photo: string | null; status: string;
  isDemo: boolean; viewCount: number; rejectionReason: string | null;
  category: { slug: string; nameUz: string; nameRu: string | null };
  business: {
    id: string; slug: string; name: string; description: string; phone: string | null; telegram: string | null;
    instagram: string | null; website: string | null; verificationStatus: string; suspendedAt: string | null; isDemo: boolean;
    logo: string | null;
    rating: Rating | null;
    /** Free trial or paid period is running, so the business's deals can be claimed. */
    onAir: boolean;
  };
  branches: Array<BranchSummary & { phone: string | null; hoursJson: string }>;
  effective: EffectiveDealStatus;
  /** Whether customers may open this page at all. */
  isPublic: boolean;
};

type DealDetailRow = Omit<DealDetail, 'category' | 'business' | 'branches' | 'effective' | 'isPublic' | 'isDemo' | 'photo'> & {
  isDemo: number; photoId: string | null; logoId: string | null; ratingBp: number | null; reviewCount: number | null; categorySlug: string; categoryNameUz: string; categoryNameRu: string | null;
  businessId: string; businessSlug: string; businessName: string; businessDescription: string; businessPhone: string | null;
  telegram: string | null; instagram: string | null; website: string | null; verificationStatus: string;
  suspendedAt: string | null; businessDeletedAt: string | null; businessIsDemo: number; onAir: number;
};

async function dealBranches(db: D1Database, dealId: string) {
  const rows = await db
    .prepare(`SELECT br.id, br.name, br.address, br.city, br.latitude_e6 AS lat, br.longitude_e6 AS lon, br.phone, br.working_hours_json AS hoursJson
      FROM deal_branches db JOIN branches br ON br.id = db.branch_id
      WHERE db.deal_id = ?1 AND br.deleted_at IS NULL ORDER BY br.name`)
    .bind(dealId)
    .all<{ id: string; name: string; address: string; city: string; lat: number; lon: number; phone: string | null; hoursJson: string }>();
  return rows.results.map(({ lat, lon, ...branch }) => ({ ...branch, latitude: lat / 1e6, longitude: lon / 1e6 }));
}

const PUBLIC_STORED_STATUSES = new Set(['ACTIVE', 'PAUSED', 'ARCHIVED']);

export async function getDealBySlug(db: D1Database, slug: string, options: { demo: boolean; now?: Date }): Promise<DealDetail | null> {
  const now = options.now ?? new Date();
  const row = await db
    .prepare(`SELECT d.id, d.slug, d.title, d.description, d.terms, d.original_price_uzs AS originalPrice,
        d.discounted_price_uzs AS price, d.discount_percent AS discountPercent, d.starts_at AS startsAt, d.ends_at AS endsAt,
        d.remaining_quantity AS remaining, d.total_quantity AS total, d.per_customer_limit AS perCustomerLimit,
        d.claim_ttl_minutes AS claimTtlMinutes, d.visual, d.status, d.is_demo AS isDemo, d.view_count AS viewCount,
        d.rejection_reason AS rejectionReason, d.photo_id AS photoId, b.logo_id AS logoId,
        b.rating_basis_points AS ratingBp, b.review_count AS reviewCount,
        c.slug AS categorySlug, c.name_uz AS categoryNameUz, c.name_ru AS categoryNameRu,
        b.id AS businessId, b.slug AS businessSlug, b.name AS businessName, b.description AS businessDescription,
        b.phone AS businessPhone, b.telegram, b.instagram, b.website, b.verification_status AS verificationStatus,
        b.suspended_at AS suspendedAt, b.deleted_at AS businessDeletedAt, b.is_demo AS businessIsDemo,
        ${subscriptionActiveSql('?2')} AS onAir
      FROM deals d JOIN businesses b ON b.id = d.business_id JOIN categories c ON c.id = d.category_id
      WHERE d.slug = ?1 AND d.deleted_at IS NULL`)
    .bind(slug, toDbTime(now))
    .first<DealDetailRow>();
  if (!row) return null;
  const businessPublic = row.verificationStatus === 'VERIFIED' && !row.suspendedAt && !row.businessDeletedAt;
  const demoVisible = options.demo || !(row.isDemo || row.businessIsDemo);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    terms: row.terms,
    originalPrice: row.originalPrice,
    price: row.price,
    discountPercent: row.discountPercent,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    remaining: row.remaining,
    total: row.total,
    perCustomerLimit: row.perCustomerLimit,
    claimTtlMinutes: row.claimTtlMinutes,
    visual: row.visual,
    photo: dealPhotoUrl(row),
    status: row.status,
    isDemo: Boolean(row.isDemo),
    viewCount: row.viewCount,
    rejectionReason: row.rejectionReason,
    category: { slug: row.categorySlug, nameUz: row.categoryNameUz, nameRu: row.categoryNameRu },
    business: {
      id: row.businessId,
      slug: row.businessSlug,
      name: row.businessName,
      description: row.businessDescription,
      phone: row.businessPhone,
      telegram: row.telegram,
      instagram: row.instagram,
      website: row.website,
      verificationStatus: row.verificationStatus,
      suspendedAt: row.suspendedAt,
      isDemo: Boolean(row.businessIsDemo),
      logo: mediaUrl(row.logoId),
      rating: rating(row.ratingBp, row.reviewCount),
      onAir: Boolean(row.onAir),
    },
    branches: await dealBranches(db, row.id),
    effective: effectiveDealStatus({ status: row.status, startsAt: row.startsAt, endsAt: row.endsAt, remainingQuantity: row.remaining }, now),
    isPublic: businessPublic && demoVisible && PUBLIC_STORED_STATUSES.has(row.status),
  };
}

export type PublicBusiness = {
  id: string; slug: string; name: string; description: string; city: string; phone: string | null;
  telegram: string | null; instagram: string | null; website: string | null; categorySlug: string | null;
  logo: string | null; cover: string | null; rating: Rating | null;
  branches: Array<BranchSummary & { phone: string | null; hoursJson: string }>;
  deals: DealCard[];
  upcoming: DealCard[];
};

export async function getPublicBusiness(db: D1Database, slug: string, options: { demo: boolean; now?: Date }): Promise<PublicBusiness | null> {
  const now = options.now ?? new Date();
  const business = await db
    .prepare(`SELECT b.id, b.slug, b.name, b.description, b.city, b.phone, b.telegram, b.instagram, b.website, c.slug AS categorySlug,
        b.logo_id AS logoId, b.cover_id AS coverId, b.rating_basis_points AS ratingBp, b.review_count AS reviewCount
      FROM businesses b LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.slug = ?1 AND ${PUBLIC_BUSINESS_SQL} AND (?2 = 1 OR b.is_demo = 0)`)
    .bind(slug, options.demo ? 1 : 0)
    .first<Omit<PublicBusiness, 'branches' | 'deals' | 'upcoming' | 'logo' | 'cover' | 'rating'> & { logoId: string | null; coverId: string | null; ratingBp: number | null; reviewCount: number | null }>();
  if (!business) return null;
  const [branches, dealRows] = await Promise.all([
    db.prepare(`SELECT id, name, address, city, latitude_e6 AS lat, longitude_e6 AS lon, phone, working_hours_json AS hoursJson
        FROM branches WHERE business_id = ?1 AND deleted_at IS NULL ORDER BY name`)
      .bind(business.id)
      .all<{ id: string; name: string; address: string; city: string; lat: number; lon: number; phone: string | null; hoursJson: string }>(),
    db.prepare(`SELECT ${DEAL_BRANCH_COLUMNS}
        FROM deals d JOIN businesses b ON b.id = d.business_id JOIN categories c ON c.id = d.category_id
        JOIN deal_branches db ON db.deal_id = d.id JOIN branches br ON br.id = db.branch_id AND br.deleted_at IS NULL
        WHERE d.business_id = ?1 AND d.status = 'ACTIVE' AND d.deleted_at IS NULL AND d.ends_at > ?2 AND (?3 = 1 OR d.is_demo = 0)
          AND ${subscriptionActiveSql('?2')}`)
      .bind(business.id, toDbTime(now), options.demo ? 1 : 0)
      .all<DealBranchRow>(),
  ]);
  const cards = sortDeals(groupDeals(dealRows.results, null, now), 'ending');
  const { logoId, coverId, ratingBp, reviewCount, ...rest } = business;
  return {
    ...rest,
    logo: mediaUrl(logoId),
    cover: mediaUrl(coverId),
    rating: rating(ratingBp, reviewCount),
    branches: branches.results.map(({ lat, lon, ...branch }) => ({ ...branch, latitude: lat / 1e6, longitude: lon / 1e6 })),
    deals: cards.filter((deal) => deal.effective === 'LIVE'),
    upcoming: cards.filter((deal) => deal.effective === 'SCHEDULED'),
  };
}

export async function getFavoriteIds(db: D1Database, userId: string) {
  const rows = await db.prepare(`SELECT deal_id AS id FROM favorites WHERE user_id = ?1`).bind(userId).all<{ id: string }>();
  return new Set(rows.results.map((row) => row.id));
}

/** Saved deals, live ones first; ended deals are kept so the user can see what they missed. */
export async function listFavoriteDeals(db: D1Database, userId: string, options: { demo: boolean; now?: Date }) {
  const now = options.now ?? new Date();
  const rows = await db
    .prepare(`SELECT ${DEAL_BRANCH_COLUMNS}, ${subscriptionActiveSql('?3')} AS onAir
      FROM favorites f JOIN deals d ON d.id = f.deal_id JOIN businesses b ON b.id = d.business_id
      JOIN categories c ON c.id = d.category_id JOIN deal_branches db ON db.deal_id = d.id
      JOIN branches br ON br.id = db.branch_id AND br.deleted_at IS NULL
      WHERE f.user_id = ?1 AND d.deleted_at IS NULL AND ${PUBLIC_BUSINESS_SQL} AND d.status IN ('ACTIVE', 'PAUSED', 'ARCHIVED')
        AND (?2 = 1 OR d.is_demo = 0)
      ORDER BY f.created_at DESC`)
    .bind(userId, options.demo ? 1 : 0, toDbTime(now))
    .all<DealBranchRow & { onAir: number }>();
  const offAir = new Set(rows.results.filter((row) => !row.onAir).map((row) => row.id));
  const cards = groupDeals(rows.results, null, now);
  const available = (deal: DealCard) => (deal.effective === 'LIVE' || deal.effective === 'SCHEDULED') && !offAir.has(deal.id);
  return {
    live: cards.filter(available),
    ended: cards.filter((deal) => !available(deal)),
  };
}

/** Everything customers saved on redeemed codes (demo deals only count in demo mode). */
export async function platformSavings(db: D1Database, options: { demo: boolean }) {
  const row = await db
    .prepare(`SELECT COALESCE(SUM(d.original_price_uzs - d.discounted_price_uzs), 0) AS saved, COUNT(*) AS redeemed
      FROM redemptions r JOIN deals d ON d.id = r.deal_id
      WHERE r.status = 'COMPLETED' AND d.original_price_uzs IS NOT NULL AND (?1 = 1 OR d.is_demo = 0)`)
    .bind(options.demo ? 1 : 0)
    .first<{ saved: number; redeemed: number }>();
  return { saved: row?.saved ?? 0, redeemed: row?.redeemed ?? 0 };
}
