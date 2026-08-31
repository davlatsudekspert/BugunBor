import { ensureDatabase, getDb } from '@/db/runtime';
import { toStoredUtc } from '@/lib/time';
import { boundingBoxE6, haversineKm } from '@/modules/geo/distance';

// Every stored timestamp is a naive-UTC ISO string (see lib/time.ts), so a
// plain string comparison against "now" formatted the same way is exact and
// chronologically ordered — no `datetime(...)` wrapper (a SQLite-ism) needed.
function nowNaive() {
  return toStoredUtc(new Date().toISOString());
}

export type DealCardRecord = {
  id: string;
  slug: string;
  dealType: 'PRODUCT' | 'SERVICE';
  title: string;
  description: string;
  terms: string;
  businessName: string;
  businessSlug: string;
  verified: boolean;
  branchId: string;
  branchName: string;
  address: string;
  city: string;
  originalPriceUzs: number | null;
  discountedPriceUzs: number;
  discountPercent: number;
  endsAt: string;
  remainingQuantity: number | null;
  remainingSlots: number | null;
  status: string;
  categorySlug: string;
  workingHoursJson: string;
  latitudeE6: number;
  longitudeE6: number;
  phone: string | null;
  distanceKm?: number;
};

/** The shared deal-card SELECT. `nowPlaceholder` is the bound-parameter number
 * (matching this query's own `?N` numbering) the caller has reserved for
 * "now" — the remaining-slots subquery below needs it too. */
function selectDealSql(nowPlaceholder: number) {
  return `
  SELECT d.id, d.slug, d.deal_type AS "dealType", d.title, d.description, d.terms,
    b.name AS "businessName", b.slug AS "businessSlug",
    (b.verification_status = 'VERIFIED') AS verified,
    br.id AS "branchId", br.name AS "branchName", br.address, br.city,
    d.original_price_uzs AS "originalPriceUzs",
    d.discounted_price_uzs AS "discountedPriceUzs",
    d.discount_percent AS "discountPercent", d.ends_at AS "endsAt",
    d.remaining_quantity AS "remainingQuantity",
    (SELECT COALESCE(SUM(s.remaining_capacity), 0)::int FROM service_slots s WHERE s.deal_id = d.id AND s.starts_at > ?${nowPlaceholder}) AS "remainingSlots",
    d.status, c.slug AS "categorySlug", br.working_hours_json AS "workingHoursJson",
    br.latitude_e6 AS "latitudeE6", br.longitude_e6 AS "longitudeE6", b.phone
  FROM deals d
  JOIN businesses b ON b.id = d.business_id
  JOIN categories c ON c.id = d.category_id
  JOIN deal_branches db ON db.deal_id = d.id
  JOIN branches br ON br.id = db.branch_id
`;
}

export type ListActiveDealsInput = {
  city?: string;
  query?: string;
  limit?: number;
  dealType?: 'PRODUCT' | 'SERVICE';
  categorySlug?: string;
  /** Filter + sort by distance from this point instead of by city. */
  near?: { lat: number; lng: number; radiusKm: number };
};

export async function listActiveDeals(input: ListActiveDealsInput = {}) {
  await ensureDatabase();
  const query = `%${input.query?.trim() || ''}%`;
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);
  const dealType = input.dealType ?? null;
  const categorySlug = input.categorySlug ?? null;
  const now = nowNaive();

  if (input.near) {
    const { lat, lng, radiusKm } = input.near;
    const box = boundingBoxE6({ lat, lng }, radiusKm);
    // Over-fetch inside the bounding box (rectangular, so wider than the circle) and
    // narrow to the exact radius with haversineKm below.
    const result = await getDb()
      .prepare(`${selectDealSql(8)}
        WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL
          AND d.starts_at <= ?8 AND d.ends_at > ?8
          AND br.latitude_e6 BETWEEN ?1 AND ?2 AND br.longitude_e6 BETWEEN ?3 AND ?4
          AND (?5 = '%%' OR d.title ILIKE ?5 OR b.name ILIKE ?5 OR d.description ILIKE ?5)
          AND (?6::text IS NULL OR d.deal_type = ?6)
          AND (?7::text IS NULL OR c.slug = ?7)
        ORDER BY d.is_sponsored DESC, d.ends_at ASC
        LIMIT 200`)
      .bind(
        box.minLatE6,
        box.maxLatE6,
        box.minLngE6,
        box.maxLngE6,
        query,
        dealType,
        categorySlug,
        now,
      )
      .all<DealCardRecord>();
    return result.results
      .map((deal) => ({
        ...deal,
        distanceKm: haversineKm(
          { lat, lng },
          {
            lat: deal.latitudeE6 / 1_000_000,
            lng: deal.longitudeE6 / 1_000_000,
          },
        ),
      }))
      .filter((deal) => deal.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  const city = input.city?.trim() || 'Toshkent';
  const result = await getDb()
    .prepare(`${selectDealSql(6)}
      WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL
        AND d.starts_at <= ?6 AND d.ends_at > ?6
        AND br.city = ?1 AND (?2 = '%%' OR d.title ILIKE ?2 OR b.name ILIKE ?2 OR d.description ILIKE ?2)
        AND (?3::text IS NULL OR d.deal_type = ?3)
        AND (?4::text IS NULL OR c.slug = ?4)
      ORDER BY d.is_sponsored DESC, d.ends_at ASC
      LIMIT ?5`)
    .bind(city, query, dealType, categorySlug, limit, now)
    .all<DealCardRecord>();
  return result.results;
}

export async function getActiveDealBySlug(slug: string) {
  await ensureDatabase();
  return getDb()
    .prepare(`${selectDealSql(2)}
      WHERE d.slug = ?1 AND d.deleted_at IS NULL
      ORDER BY d.ends_at DESC LIMIT 1`)
    .bind(slug, nowNaive())
    .first<DealCardRecord>();
}

export type DealImageRecord = {
  id: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
};

export async function listDealImages(dealId: string) {
  await ensureDatabase();
  const result = await getDb()
    .prepare(
      'SELECT id, url, sort_order AS "sortOrder", is_cover AS "isCover" FROM deal_images WHERE deal_id = ?1 ORDER BY sort_order ASC',
    )
    .bind(dealId)
    .all<DealImageRecord>();
  return result.results;
}

export type ServiceSlotRecord = {
  id: string;
  startsAt: string;
  capacity: number;
  remainingCapacity: number;
};

export async function listUpcomingServiceSlots(dealId: string) {
  await ensureDatabase();
  const result = await getDb()
    .prepare(`SELECT id, starts_at AS "startsAt", capacity, remaining_capacity AS "remainingCapacity"
      FROM service_slots WHERE deal_id = ?1 AND starts_at > ?2 ORDER BY starts_at ASC`)
    .bind(dealId, nowNaive())
    .all<ServiceSlotRecord>();
  return result.results;
}

export async function listCategories() {
  await ensureDatabase();
  const result = await getDb()
    .prepare(
      `
    SELECT c.slug, c.name_uz AS name, c.icon, COUNT(d.id)::int AS "activeCount"
    FROM categories c
    LEFT JOIN deals d ON d.category_id = c.id AND d.status = 'ACTIVE'
      AND d.starts_at <= ?1 AND d.ends_at > ?1
    WHERE c.is_active = 1
    GROUP BY c.id ORDER BY c.sort_order ASC
  `,
    )
    .bind(nowNaive())
    .all<{ slug: string; name: string; icon: string; activeCount: number }>();
  return result.results;
}
