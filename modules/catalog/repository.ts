import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { boundingBoxE6, haversineKm } from '@/modules/geo/distance';

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

const selectDeal = `
  SELECT d.id, d.slug, d.deal_type AS dealType, d.title, d.description, d.terms,
    b.name AS businessName, b.slug AS businessSlug,
    (b.verification_status = 'VERIFIED') AS verified,
    br.id AS branchId, br.name AS branchName, br.address, br.city,
    d.original_price_uzs AS originalPriceUzs,
    d.discounted_price_uzs AS discountedPriceUzs,
    d.discount_percent AS discountPercent, d.ends_at AS endsAt,
    d.remaining_quantity AS remainingQuantity,
    (SELECT COALESCE(SUM(s.remaining_capacity), 0) FROM service_slots s WHERE s.deal_id = d.id AND datetime(s.starts_at) > datetime('now')) AS remainingSlots,
    d.status, c.slug AS categorySlug, br.working_hours_json AS workingHoursJson,
    br.latitude_e6 AS latitudeE6, br.longitude_e6 AS longitudeE6, b.phone
  FROM deals d
  JOIN businesses b ON b.id = d.business_id
  JOIN categories c ON c.id = d.category_id
  JOIN deal_branches db ON db.deal_id = d.id
  JOIN branches br ON br.id = db.branch_id
`;

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
  await ensurePhase1Database();
  const query = `%${input.query?.trim() || ''}%`;
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);
  const dealType = input.dealType ?? null;
  const categorySlug = input.categorySlug ?? null;

  if (input.near) {
    const { lat, lng, radiusKm } = input.near;
    const box = boundingBoxE6({ lat, lng }, radiusKm);
    // Over-fetch inside the bounding box (rectangular, so wider than the circle) and
    // narrow to the exact radius with haversineKm below.
    const result = await getD1()
      .prepare(`${selectDeal}
        WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL
          AND datetime(d.starts_at) <= datetime('now') AND datetime(d.ends_at) > datetime('now')
          AND br.latitude_e6 BETWEEN ?1 AND ?2 AND br.longitude_e6 BETWEEN ?3 AND ?4
          AND (?5 = '%%' OR d.title LIKE ?5 OR b.name LIKE ?5 OR d.description LIKE ?5)
          AND (?6 IS NULL OR d.deal_type = ?6)
          AND (?7 IS NULL OR c.slug = ?7)
        ORDER BY d.is_sponsored DESC, datetime(d.ends_at) ASC
        LIMIT 200`)
      .bind(
        box.minLatE6,
        box.maxLatE6,
        box.minLngE6,
        box.maxLngE6,
        query,
        dealType,
        categorySlug,
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
  const result = await getD1()
    .prepare(`${selectDeal}
      WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL
        AND datetime(d.starts_at) <= datetime('now') AND datetime(d.ends_at) > datetime('now')
        AND br.city = ?1 AND (?2 = '%%' OR d.title LIKE ?2 OR b.name LIKE ?2 OR d.description LIKE ?2)
        AND (?3 IS NULL OR d.deal_type = ?3)
        AND (?4 IS NULL OR c.slug = ?4)
      ORDER BY d.is_sponsored DESC, datetime(d.ends_at) ASC
      LIMIT ?5`)
    .bind(city, query, dealType, categorySlug, limit)
    .all<DealCardRecord>();
  return result.results;
}

export async function getActiveDealBySlug(slug: string) {
  await ensurePhase1Database();
  return getD1()
    .prepare(`${selectDeal}
      WHERE d.slug = ?1 AND d.deleted_at IS NULL
      ORDER BY datetime(d.ends_at) DESC LIMIT 1`)
    .bind(slug)
    .first<DealCardRecord>();
}

export type DealImageRecord = {
  id: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
};

export async function listDealImages(dealId: string) {
  await ensurePhase1Database();
  const result = await getD1()
    .prepare(
      'SELECT id, url, sort_order AS sortOrder, is_cover AS isCover FROM deal_images WHERE deal_id = ?1 ORDER BY sort_order ASC',
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
  await ensurePhase1Database();
  const result = await getD1()
    .prepare(`SELECT id, starts_at AS startsAt, capacity, remaining_capacity AS remainingCapacity
      FROM service_slots WHERE deal_id = ?1 AND datetime(starts_at) > datetime('now') ORDER BY datetime(starts_at) ASC`)
    .bind(dealId)
    .all<ServiceSlotRecord>();
  return result.results;
}

export async function listCategories() {
  await ensurePhase1Database();
  const result = await getD1()
    .prepare(`
    SELECT c.slug, c.name_uz AS name, c.icon, COUNT(d.id) AS activeCount
    FROM categories c
    LEFT JOIN deals d ON d.category_id = c.id AND d.status = 'ACTIVE'
      AND datetime(d.starts_at) <= datetime('now') AND datetime(d.ends_at) > datetime('now')
    WHERE c.is_active = 1
    GROUP BY c.id ORDER BY c.sort_order ASC
  `)
    .all<{ slug: string; name: string; icon: string; activeCount: number }>();
  return result.results;
}
