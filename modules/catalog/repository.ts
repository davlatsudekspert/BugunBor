import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';

export type DealCardRecord = {
  id: string;
  slug: string;
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
  status: string;
  categorySlug: string;
  workingHoursJson: string;
  latitudeE6: number;
  longitudeE6: number;
  phone: string | null;
  isSponsored: boolean;
};

const selectDeal = `
  SELECT d.id, d.slug, d.title, d.description, d.terms,
    b.name AS businessName, b.slug AS businessSlug,
    (b.verification_status = 'VERIFIED') AS verified,
    br.id AS branchId, br.name AS branchName, br.address, br.city,
    d.original_price_uzs AS originalPriceUzs,
    d.discounted_price_uzs AS discountedPriceUzs,
    d.discount_percent AS discountPercent, d.ends_at AS endsAt,
    d.remaining_quantity AS remainingQuantity, d.status,
    c.slug AS categorySlug, br.working_hours_json AS workingHoursJson,
    br.latitude_e6 AS latitudeE6, br.longitude_e6 AS longitudeE6, b.phone,
    d.is_sponsored AS isSponsored
  FROM deals d
  JOIN businesses b ON b.id = d.business_id
  JOIN categories c ON c.id = d.category_id
  JOIN deal_branches db ON db.deal_id = d.id
  JOIN branches br ON br.id = db.branch_id
`;

export async function listActiveDeals(input: { region?: string; city?: string; query?: string; limit?: number } = {}) {
  await ensurePhase1Database();
  await syncDealLifecycle();
  const region = input.region?.trim() || 'Toshkent shahri';
  // Empty city means "butun viloyat" (whole region); a specific city/district narrows within it.
  const city = input.city?.trim() || '';
  const query = `%${input.query?.trim() || ''}%`;
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);
  const result = await getD1()
    .prepare(`${selectDeal}
      WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL
        AND datetime(d.starts_at) <= datetime('now') AND datetime(d.ends_at) > datetime('now')
        AND ((?2 = '' AND br.region = ?1) OR (?2 != '' AND br.city = ?2))
        AND (?3 = '%%' OR d.title LIKE ?3 OR b.name LIKE ?3 OR d.description LIKE ?3)
      ORDER BY d.is_sponsored DESC, datetime(d.ends_at) ASC
      LIMIT ?4`)
    .bind(region, city, query, limit)
    .all<DealCardRecord>();
  return result.results;
}

export async function getActiveDealBySlug(slug: string) {
  await ensurePhase1Database();
  await syncDealLifecycle();
  return getD1()
    .prepare(`${selectDeal}
      WHERE d.slug = ?1 AND d.deleted_at IS NULL
      ORDER BY datetime(d.ends_at) DESC LIMIT 1`)
    .bind(slug)
    .first<DealCardRecord>();
}

/** Every deal a customer has saved, most recently saved first — including an expired one, so they can see it ended. */
export async function listFavoriteDeals(userId: string) {
  await ensurePhase1Database();
  await syncDealLifecycle();
  const result = await getD1()
    .prepare(`${selectDeal}
      JOIN favorites f ON f.deal_id = d.id
      WHERE f.user_id = ?1 AND d.deleted_at IS NULL
      ORDER BY f.created_at DESC`)
    .bind(userId)
    .all<DealCardRecord>();
  return result.results;
}

export async function isDealFavorited(userId: string, dealId: string) {
  await ensurePhase1Database();
  const row = await getD1().prepare(`SELECT 1 FROM favorites WHERE user_id = ?1 AND deal_id = ?2`).bind(userId, dealId).first();
  return Boolean(row);
}

/** Adds or removes a favorite and reports which it ended up doing. */
export async function toggleFavorite(userId: string, dealId: string): Promise<boolean> {
  await ensurePhase1Database();
  const db = getD1();
  const existing = await db.prepare(`SELECT 1 FROM favorites WHERE user_id = ?1 AND deal_id = ?2`).bind(userId, dealId).first();
  if (existing) {
    await db.prepare(`DELETE FROM favorites WHERE user_id = ?1 AND deal_id = ?2`).bind(userId, dealId).run();
    return false;
  }
  await db.prepare(`INSERT OR IGNORE INTO favorites(user_id, deal_id) VALUES (?1, ?2)`).bind(userId, dealId).run();
  return true;
}

export async function listCategories() {
  await ensurePhase1Database();
  await syncDealLifecycle();
  const result = await getD1().prepare(`
    SELECT c.slug, c.name_uz AS name, c.icon, COUNT(d.id) AS activeCount
    FROM categories c
    LEFT JOIN deals d ON d.category_id = c.id AND d.status = 'ACTIVE'
      AND datetime(d.starts_at) <= datetime('now') AND datetime(d.ends_at) > datetime('now')
    WHERE c.is_active = 1
    GROUP BY c.id ORDER BY c.sort_order ASC
  `).all<{ slug: string; name: string; icon: string; activeCount: number }>();
  return result.results;
}
