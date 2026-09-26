import { CITIES } from '@/lib/cities';
import { buildSearchText } from '@/lib/search';
import { addMinutes, toDbTime } from '@/lib/time';
import { buildDemoCatalog, DEMO_CATALOG_VERSION } from './demo-catalog';

// Fictional demo data. Only loaded in development or when DEMO_SEED=true, and
// always marked is_demo = 1 so production listings can hide it. Demo
// businesses have no phone or Telegram so nobody real can be reached by mistake.

/** Stored in app_settings; the full seed only runs again when this changes. */
export const DEMO_SEED_VERSION = `${DEMO_CATALOG_VERSION}+curated.4`;

const cityPoint = (slug: string, dLat = 0, dLon = 0) => {
  const city = CITIES.find((item) => item.slug === slug)!;
  return { lat: Math.round((city.latitude + dLat) * 1e6), lon: Math.round((city.longitude + dLon) * 1e6) };
};

const users = [
  { id: 'usr_customer_demo', role: 'CUSTOMER', name: 'Aziza Karimova' },
  { id: 'usr_owner_demo', role: 'CUSTOMER', name: 'Sardor Rahimov' },
  { id: 'usr_cashier_demo', role: 'CUSTOMER', name: 'Jasur Toshmatov' },
  { id: 'usr_moderator_demo', role: 'MODERATOR', name: 'Madina Qodirova' },
  { id: 'usr_admin_demo', role: 'ADMIN', name: 'Kamol Sodiqov' },
] as const;

export const DEMO_USERS = users;

const businesses = [
  { id: 'biz_besh_qozon', slug: 'oltin-qozon', name: 'Oltin Qozon', category: 'cat_food', city: 'tashkent', status: 'VERIFIED', description: 'Toshkent palovi, milliy taomlar va oilaviy setlar. Har kuni 10:00 dan.' },
  { id: 'biz_safia', slug: 'shirin-lahza', name: 'Shirin Lahza', category: 'cat_coffee', city: 'tashkent', status: 'VERIFIED', description: 'Har kuni yangi pishiriq, tortlar va desertlar.' },
  { id: 'biz_bookuz', slug: 'kitob-uyi', name: 'Kitob Uyi', category: 'cat_shop', city: 'tashkent', status: 'VERIFIED', description: 'Kitoblar, sovg‘alar va foydali to‘plamlar.' },
  { id: 'biz_anhor', slug: 'bog-choyxona', name: 'Bog‘ Choyxona', category: 'cat_food', city: 'tashkent', status: 'VERIFIED', description: 'Oilaviy choyxona, lag‘mon va tezkor tushliklar.' },
  { id: 'biz_aroma', slug: 'aroma-kofe', name: 'Aroma Kofe', category: 'cat_coffee', city: 'tashkent', status: 'VERIFIED', description: 'Qovurilgan kofe, kruassanlar va shinam muhit.' },
  { id: 'biz_nafis', slug: 'nafis-salon', name: 'Nafis go‘zallik saloni', category: 'cat_beauty', city: 'samarkand', status: 'VERIFIED', description: 'Manikyur, pedikyur va soch turmagi.' },
  { id: 'biz_kuch', slug: 'kuch-fitnes', name: 'Kuch Fitnes', category: 'cat_sport', city: 'andijan', status: 'VERIFIED', description: 'Zamonaviy trenajyorlar va guruh mashg‘ulotlari.' },
  { id: 'biz_burger_demo', slug: 'yangi-burger', name: 'Yangi Burger', category: 'cat_food', city: 'tashkent', status: 'PENDING', description: 'Yangi ochilgan burgerxona: go‘shtli va tovuqli burgerlar.' },
] as const;

const branches = [
  { id: 'br_besh_yunusobod', business: 'biz_besh_qozon', name: 'Yunusobod filiali', city: 'tashkent', address: 'Amir Temur ko‘chasi, 108', point: cityPoint('tashkent', 0.038, 0.0075), hours: { open: '10:00', close: '23:00' } },
  { id: 'br_oltin_chilonzor', business: 'biz_besh_qozon', name: 'Chilonzor filiali', city: 'tashkent', address: 'Bunyodkor shoh ko‘chasi, 21', point: cityPoint('tashkent', -0.03, -0.055), hours: { open: '10:00', close: '22:00' } },
  { id: 'br_safia_chilonzor', business: 'biz_safia', name: 'Chilonzor 19-kvartal', city: 'tashkent', address: 'Bunyodkor shoh ko‘chasi, 52', point: cityPoint('tashkent', -0.026, -0.058), hours: { open: '08:00', close: '22:00' } },
  { id: 'br_book_samarkand', business: 'biz_bookuz', name: 'Samarqand Darvoza', city: 'tashkent', address: 'Qoratosh ko‘chasi, 5A', point: cityPoint('tashkent', 0.0057, -0.049), hours: { open: '10:00', close: '22:00' } },
  { id: 'br_anhor_main', business: 'biz_anhor', name: 'Anhor filiali', city: 'tashkent', address: 'Labzak ko‘chasi, 12/1', point: cityPoint('tashkent', 0.0205, -0.0133), hours: { open: '09:00', close: '23:00' } },
  { id: 'br_aroma_center', business: 'biz_aroma', name: 'Markaz', city: 'tashkent', address: 'Mustaqillik maydoni yonida, 3', point: cityPoint('tashkent', 0.004, 0.0), hours: { open: '07:30', close: '23:30' } },
  { id: 'br_nafis_main', business: 'biz_nafis', name: 'Registon', city: 'samarkand', address: 'Registon ko‘chasi, 14', point: cityPoint('samarkand', 0.0, 0.01), hours: { open: '09:00', close: '20:00' } },
  { id: 'br_kuch_main', business: 'biz_kuch', name: 'Bobur shoh ko‘chasi', city: 'andijan', address: 'Bobur shoh ko‘chasi, 44', point: cityPoint('andijan', 0.01, -0.01), hours: { open: '06:00', close: '23:00' } },
  { id: 'br_burger_main', business: 'biz_burger_demo', name: 'Asosiy filial', city: 'tashkent', address: 'Shota Rustaveli ko‘chasi, 9', point: cityPoint('tashkent', -0.01, 0.01), hours: { open: '11:00', close: '23:00' } },
] as const;

type DemoDeal = {
  id: string; business: string; category: string; slug: string; title: string; description: string; terms: string;
  original: number; price: number; startMin: number; endMin: number; total: number | null; remaining: number | null;
  limit: number; ttl: number; status: string; visual: string; branches: string[];
};

const deals: DemoDeal[] = [
  { id: 'deal_osh', business: 'biz_besh_qozon', category: 'cat_food', slug: 'toy-oshi-chegirma', title: 'To‘y oshi va achchiq-chuchuk', description: 'Bir porsiya to‘y oshi, achchiq-chuchuk salat va issiq non.', terms: 'Faqat restoranda. Boshqa chegirmalar bilan qo‘shilmaydi.', original: 62000, price: 44000, startMin: -60, endMin: 120, total: 40, remaining: 18, limit: 1, ttl: 120, status: 'ACTIVE', visual: 'plov', branches: ['br_besh_yunusobod', 'br_oltin_chilonzor'] },
  { id: 'deal_cake', business: 'biz_safia', category: 'cat_coffee', slug: 'kechki-tort-chegirmasi', title: 'Butun tortlar kechki narxda', description: 'Bugun pishirilgan butun tortlar (1 kg) — kechki maxsus narx.', terms: 'Mavjud assortimentdan. Oldindan buyurtmaga tatbiq etilmaydi.', original: 240000, price: 168000, startMin: -60, endMin: 240, total: 20, remaining: 7, limit: 1, ttl: 120, status: 'ACTIVE', visual: 'cake', branches: ['br_safia_chilonzor'] },
  { id: 'deal_books', business: 'biz_bookuz', category: 'cat_shop', slug: 'biznes-kitoblar-toplami', title: 'Biznes kitoblar to‘plami', description: 'Uchta mashhur biznes kitobi bitta jamlanmada.', terms: 'Do‘kondan olib ketish. Bir mijozga bitta to‘plam.', original: 270000, price: 189000, startMin: -120, endMin: 360, total: 25, remaining: 11, limit: 1, ttl: 240, status: 'ACTIVE', visual: 'books', branches: ['br_book_samarkand'] },
  { id: 'deal_lagmon', business: 'biz_anhor', category: 'cat_food', slug: 'lagmon-salat-kombo', title: 'Lag‘mon va salat kombo', description: 'Issiq lag‘mon va yangi sabzavotli salat.', terms: 'Choyxonada iste’mol qilish uchun. Bir mijozga bir marta.', original: 58000, price: 42000, startMin: -60, endMin: 50, total: 35, remaining: 13, limit: 1, ttl: 60, status: 'ACTIVE', visual: 'noodles', branches: ['br_anhor_main'] },
  { id: 'deal_coffee', business: 'biz_aroma', category: 'cat_coffee', slug: 'ertalabki-kofe-kruassan', title: 'Ertalabki kofe + kruassan', description: 'Katta kapuchino yoki latte va yangi pishgan kruassan.', terms: 'Soat 12:00 gacha. Bir mijozga kuniga ikki marta.', original: 60000, price: 39000, startMin: -30, endMin: 180, total: null, remaining: null, limit: 2, ttl: 60, status: 'ACTIVE', visual: 'coffee', branches: ['br_aroma_center'] },
  { id: 'deal_dessert', business: 'biz_aroma', category: 'cat_coffee', slug: 'kechki-desert-seti', title: 'Kechki desert seti', description: 'Ikki desert va ikki choy — do‘stlar bilan kechki uchrashuv uchun.', terms: 'Faqat kafeda. Stol band qilish shart emas.', original: 120000, price: 79000, startMin: 300, endMin: 540, total: 15, remaining: 15, limit: 1, ttl: 120, status: 'ACTIVE', visual: 'dessert', branches: ['br_aroma_center'] },
  { id: 'deal_salon', business: 'biz_nafis', category: 'cat_beauty', slug: 'manikyur-chegirma', title: 'Manikyur 30% chegirma bilan', description: 'Klassik manikyur va gel-lak qoplama.', terms: 'Kodni tashrif paytida ko‘rsating. Navbat bo‘lsa, vaqtni joyida kelishib olasiz.', original: 150000, price: 105000, startMin: -30, endMin: 1440, total: 10, remaining: 6, limit: 1, ttl: 240, status: 'ACTIVE', visual: 'beauty', branches: ['br_nafis_main'] },
  { id: 'deal_fitness', business: 'biz_kuch', category: 'cat_sport', slug: 'bir-martalik-mashgulot', title: 'Bir martalik mashg‘ulot yarim narxda', description: 'Trenajyor zali va dush — bir martalik tashrif.', terms: 'Sport kiyimi va almashtiriladigan poyabzal bilan keling.', original: 60000, price: 30000, startMin: -30, endMin: 2880, total: 30, remaining: 22, limit: 1, ttl: 240, status: 'ACTIVE', visual: 'fitness', branches: ['br_kuch_main'] },
  { id: 'deal_pending', business: 'biz_besh_qozon', category: 'cat_food', slug: 'oilaviy-osh-seti', title: 'Oilaviy osh seti', description: 'To‘rt kishilik palov, salatlar va issiq non.', terms: 'Faqat ish kunlari. Buyurtmani kamida 2 soat oldin bering.', original: 280000, price: 210000, startMin: 60, endMin: 2880, total: 30, remaining: 30, limit: 1, ttl: 120, status: 'PENDING_REVIEW', visual: 'plov', branches: ['br_besh_yunusobod'] },
];

const memberships = [
  ['biz_besh_qozon', 'usr_owner_demo', 'OWNER'],
  ['biz_aroma', 'usr_owner_demo', 'OWNER'],
  ['biz_burger_demo', 'usr_owner_demo', 'OWNER'],
  ['biz_besh_qozon', 'usr_cashier_demo', 'CASHIER'],
] as const;

type SqlValue = string | number | null;

function sqlLiteral(value: SqlValue) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Demo seed: invalid number');
    return String(value);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

/**
 * Multi-row statements with inlined literals (all values are our own constants).
 * D1 caps statements per request and bound parameters per statement, so a few
 * large statements beat hundreds of small ones.
 */
function multiRow(db: D1Database, head: string, rows: SqlValue[][], tail = '', chunkSize = 40) {
  const statements: D1PreparedStatement[] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const values = rows.slice(index, index + chunkSize).map((row) => `(${row.map(sqlLiteral).join(', ')})`).join(',\n');
    statements.push(db.prepare(`${head} VALUES ${values} ${tail}`));
  }
  return statements;
}

async function seededVersion(db: D1Database) {
  const row = await db.prepare(`SELECT value FROM app_settings WHERE key = 'demo_seed_version'`).first<{ value: string }>();
  return row?.value ?? null;
}

/**
 * Loads the demo catalog: curated showcase businesses plus one generated
 * business per city and category. Runs fully only when DEMO_SEED_VERSION
 * changes (or with `force`); otherwise it just keeps demo deals fresh.
 */
export async function seedDemoData(db: D1Database, now = new Date(), options: { force?: boolean } = {}) {
  if (!options.force && (await seededVersion(db)) === DEMO_SEED_VERSION) {
    await refreshDemoData(db, now);
    return;
  }

  const nowDb = toDbTime(now);
  // Demo businesses stay on their free period for a year from the latest refresh.
  const trialEndsAt = toDbTime(addMinutes(now, 365 * 24 * 60));
  const catalog = buildDemoCatalog(now);

  const businessRows: SqlValue[][] = [
    ...businesses.map((business) => {
      const verified = business.status === 'VERIFIED';
      return [business.id, business.slug, business.name, business.description, business.city, business.category, business.status,
        verified ? nowDb : null, 1, buildSearchText(business.name, business.description), verified ? trialEndsAt : null];
    }),
    ...catalog.businesses.map((business) => [business.id, business.slug, business.name, business.description, business.city,
      business.categoryId, 'VERIFIED', nowDb, 1, business.searchText, trialEndsAt]),
  ];

  const branchRows: SqlValue[][] = [
    ...branches.map((branch) => [branch.id, branch.business, branch.name, branch.city, branch.address, branch.point.lat, branch.point.lon, JSON.stringify(branch.hours)]),
    ...catalog.branches.map((branch) => [branch.id, branch.businessId, branch.name, branch.city, branch.address, branch.latitudeE6, branch.longitudeE6, branch.hoursJson]),
  ];

  const dealRows: SqlValue[][] = [
    ...deals.map((deal) => [deal.id, deal.business, deal.category, deal.slug, deal.title, deal.description, deal.terms, deal.original, deal.price,
      Math.round(((deal.original - deal.price) / deal.original) * 100), toDbTime(addMinutes(now, deal.startMin)), toDbTime(addMinutes(now, deal.endMin)),
      deal.total, deal.remaining, deal.limit, deal.status, deal.ttl, deal.visual, buildSearchText(deal.title, deal.description), nowDb,
      deal.status === 'ACTIVE' ? nowDb : null, 'ONSITE_CODE', 'usr_owner_demo', 1]),
    ...catalog.deals.map((deal) => [deal.id, deal.businessId, deal.categoryId, deal.slug, deal.title, deal.description, deal.terms, deal.originalPrice,
      deal.price, deal.discountPercent, deal.startsAt, deal.endsAt, deal.totalQuantity, deal.remainingQuantity, deal.perCustomerLimit, 'ACTIVE',
      deal.claimTtlMinutes, deal.visual, deal.searchText, nowDb, nowDb, 'ONSITE_CODE', 'usr_owner_demo', 1]),
  ];

  const dealBranchRows: SqlValue[][] = [
    ...deals.flatMap((deal) => deal.branches.map((branchId) => [deal.id, branchId])),
    ...catalog.deals.map((deal) => [deal.id, deal.branchId]),
  ];

  // Time windows and stock are reset only for deals that ended (or on force),
  // so claims made while someone is trying the demo are not wiped.
  const reset = `(${options.force ? 1 : 0} = 1 OR deals.ends_at <= ${sqlLiteral(nowDb)} OR deals.status NOT IN ('ACTIVE', 'PENDING_REVIEW', 'PAUSED'))`;

  await db.batch([
    ...multiRow(db, `INSERT INTO users(id, role, display_name, locale)`, users.map((user) => [user.id, user.role, user.name, 'uz']),
      `ON CONFLICT(id) DO UPDATE SET role = excluded.role, display_name = excluded.display_name, phone = NULL, status = 'ACTIVE', deleted_at = NULL`),
    ...multiRow(db, `INSERT INTO businesses(id, slug, name, description, city, category_id, verification_status, verified_at, is_demo, search_text, trial_ends_at)`, businessRows,
      `ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description, city = excluded.city,
        category_id = excluded.category_id, phone = NULL, telegram = NULL, is_demo = 1, search_text = excluded.search_text,
        deleted_at = NULL, suspended_at = NULL, suspended_reason = NULL,
        trial_ends_at = CASE WHEN businesses.verification_status = 'VERIFIED' THEN ${sqlLiteral(trialEndsAt)} ELSE businesses.trial_ends_at END`),
    ...multiRow(db, `INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, working_hours_json)`, branchRows,
      `ON CONFLICT(id) DO UPDATE SET business_id = excluded.business_id, name = excluded.name, city = excluded.city, address = excluded.address,
        latitude_e6 = excluded.latitude_e6, longitude_e6 = excluded.longitude_e6, working_hours_json = excluded.working_hours_json,
        phone = NULL, deleted_at = NULL`),
    ...multiRow(db, `INSERT INTO business_members(business_id, user_id, role)`, memberships.map((row) => [...row]),
      `ON CONFLICT(business_id, user_id) DO UPDATE SET role = excluded.role, revoked_at = NULL`),
    ...multiRow(db, `INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs,
        discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, status, claim_ttl_minutes, visual,
        search_text, submitted_at, approved_at, redemption_method, created_by_id, is_demo)`, dealRows,
      `ON CONFLICT(id) DO UPDATE SET business_id = excluded.business_id, category_id = excluded.category_id, slug = excluded.slug,
        title = excluded.title, description = excluded.description, terms = excluded.terms,
        original_price_uzs = excluded.original_price_uzs, discounted_price_uzs = excluded.discounted_price_uzs,
        discount_percent = excluded.discount_percent, per_customer_limit = excluded.per_customer_limit,
        claim_ttl_minutes = excluded.claim_ttl_minutes, visual = excluded.visual, search_text = excluded.search_text,
        is_demo = 1, deleted_at = NULL, archived_at = NULL,
        status = CASE WHEN ${reset} THEN excluded.status ELSE deals.status END,
        starts_at = CASE WHEN ${reset} THEN excluded.starts_at ELSE deals.starts_at END,
        ends_at = CASE WHEN ${reset} THEN excluded.ends_at ELSE deals.ends_at END,
        total_quantity = CASE WHEN ${reset} THEN excluded.total_quantity ELSE deals.total_quantity END,
        remaining_quantity = CASE WHEN ${reset} THEN excluded.remaining_quantity ELSE deals.remaining_quantity END`),
    ...multiRow(db, `INSERT OR IGNORE INTO deal_branches(deal_id, branch_id)`, dealBranchRows, '', 120),
    db.prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES ('demo_seed_version', ?1, ?2)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(DEMO_SEED_VERSION, nowDb),
  ]);
}

/**
 * Keeps the demo alive without reseeding: ended demo deals start a new window
 * with fresh stock, and demo businesses never run out of their free period.
 * One cheap pass; called at most every few minutes.
 */
export async function refreshDemoData(db: D1Database, now = new Date()) {
  const nowDb = toDbTime(now);
  await db.batch([
    db.prepare(`UPDATE deals SET
        starts_at = strftime('%Y-%m-%d %H:%M:%S', ?1, '-15 minutes'),
        ends_at = strftime('%Y-%m-%d %H:%M:%S', ?1, '+' || MAX(90, CAST(ROUND((julianday(ends_at) - julianday(starts_at)) * 1440) AS INTEGER)) || ' minutes'),
        remaining_quantity = CASE WHEN total_quantity IS NULL THEN NULL ELSE MAX(1, (total_quantity * (30 + ABS(RANDOM() % 61))) / 100) END,
        updated_at = ?1
      WHERE is_demo = 1 AND deleted_at IS NULL AND archived_at IS NULL AND status = 'ACTIVE' AND ends_at <= ?1`).bind(nowDb),
    db.prepare(`UPDATE businesses SET trial_ends_at = ?2
      WHERE is_demo = 1 AND verification_status = 'VERIFIED' AND deleted_at IS NULL AND (trial_ends_at IS NULL OR trial_ends_at < ?3)`)
      .bind(nowDb, toDbTime(addMinutes(now, 365 * 24 * 60)), toDbTime(addMinutes(now, 30 * 24 * 60))),
  ]);
}

/** Development only: forget all activity on demo deals and restore the seed state. */
export async function resetDemoData(db: D1Database, now = new Date()) {
  const demoDeals = `SELECT id FROM deals WHERE is_demo = 1 OR business_id IN (SELECT id FROM businesses WHERE is_demo = 1)`;
  const demoBusinesses = `SELECT id FROM businesses WHERE is_demo = 1`;
  await db.batch([
    db.prepare(`DELETE FROM reviews WHERE business_id IN (${demoBusinesses}) OR deal_id IN (${demoDeals})`),
    db.prepare(`DELETE FROM follows WHERE business_id IN (${demoBusinesses})`),
    db.prepare(`DELETE FROM notifications WHERE user_id IN (${users.map((user) => `'${user.id}'`).join(', ')})`),
    db.prepare(`UPDATE businesses SET rating_basis_points = 0, review_count = 0 WHERE is_demo = 1`),
    db.prepare(`DELETE FROM redemption_events WHERE redemption_id IN (SELECT id FROM redemptions WHERE deal_id IN (${demoDeals}))`),
    db.prepare(`DELETE FROM redemptions WHERE deal_id IN (${demoDeals})`),
    db.prepare(`DELETE FROM favorites WHERE deal_id IN (${demoDeals})`),
    db.prepare(`DELETE FROM deal_branches WHERE deal_id IN (SELECT id FROM deals WHERE is_demo = 0 AND business_id IN (SELECT id FROM businesses WHERE is_demo = 1))`),
    db.prepare(`DELETE FROM deals WHERE is_demo = 0 AND business_id IN (SELECT id FROM businesses WHERE is_demo = 1)`),
    db.prepare(`UPDATE businesses SET verification_status = 'PENDING', rejection_reason = NULL, trial_ends_at = NULL, verified_at = NULL WHERE id = 'biz_burger_demo'`),
    db.prepare(`UPDATE business_members SET revoked_at = NULL WHERE user_id IN ('usr_owner_demo', 'usr_cashier_demo')`),
    db.prepare(`DELETE FROM billing_requests WHERE business_id IN (SELECT id FROM businesses WHERE is_demo = 1)`),
    db.prepare(`UPDATE businesses SET plan_code = NULL, paid_until = NULL WHERE is_demo = 1`),
  ]);
  await seedDemoData(db, now, { force: true });
}
