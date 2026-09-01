import { env } from 'cloudflare:workers';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, role TEXT NOT NULL, phone TEXT, email TEXT, display_name TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'uz-Latn', status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, parent_id TEXT, slug TEXT NOT NULL UNIQUE, name_uz TEXT NOT NULL,
    icon TEXT, sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL,
    city TEXT NOT NULL, category_id TEXT, phone TEXT, verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    rating_basis_points INTEGER NOT NULL DEFAULT 0, review_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT, FOREIGN KEY(category_id) REFERENCES categories(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_businesses_city_verification ON businesses(city, verification_status)`,
  `CREATE TABLE IF NOT EXISTS business_members (
    business_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL,
    permissions_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT, PRIMARY KEY(business_id, user_id),
    FOREIGN KEY(business_id) REFERENCES businesses(id), FOREIGN KEY(user_id) REFERENCES users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members(user_id, revoked_at)`,
  `CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL, city TEXT NOT NULL,
    address TEXT NOT NULL, latitude_e6 INTEGER NOT NULL, longitude_e6 INTEGER NOT NULL,
    phone TEXT, working_hours_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT,
    FOREIGN KEY(business_id) REFERENCES businesses(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_branches_business ON branches(business_id, deleted_at)`,
  `CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY, business_id TEXT NOT NULL, category_id TEXT NOT NULL, slug TEXT NOT NULL,
    title TEXT NOT NULL, description TEXT NOT NULL, terms TEXT NOT NULL, original_price_uzs INTEGER,
    discounted_price_uzs INTEGER NOT NULL, discount_percent INTEGER NOT NULL,
    starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, total_quantity INTEGER, remaining_quantity INTEGER,
    per_customer_limit INTEGER NOT NULL DEFAULT 1, redemption_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', is_sponsored INTEGER NOT NULL DEFAULT 0,
    created_by_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT,
    UNIQUE(business_id, slug), FOREIGN KEY(business_id) REFERENCES businesses(id),
    FOREIGN KEY(category_id) REFERENCES categories(id), FOREIGN KEY(created_by_id) REFERENCES users(id),
    CHECK(ends_at > starts_at), CHECK(remaining_quantity IS NULL OR remaining_quantity >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_deals_public_window ON deals(status, starts_at, ends_at)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_category_status ON deals(category_id, status)`,
  `CREATE TABLE IF NOT EXISTS deal_branches (
    deal_id TEXT NOT NULL, branch_id TEXT NOT NULL, capacity INTEGER,
    PRIMARY KEY(deal_id, branch_id), FOREIGN KEY(deal_id) REFERENCES deals(id), FOREIGN KEY(branch_id) REFERENCES branches(id)
  )`,
  `CREATE TABLE IF NOT EXISTS redemptions (
    id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, branch_id TEXT NOT NULL, user_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE, code_hash TEXT NOT NULL UNIQUE, code_hint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CLAIMED', expires_at TEXT NOT NULL, completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deal_id) REFERENCES deals(id), FOREIGN KEY(branch_id) REFERENCES branches(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_redemptions_deal_status ON redemptions(deal_id, status)`,
  `CREATE TABLE IF NOT EXISTS redemption_events (
    id TEXT PRIMARY KEY, redemption_id TEXT NOT NULL, actor_user_id TEXT, type TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(redemption_id) REFERENCES redemptions(id), FOREIGN KEY(actor_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS moderation_actions (
    id TEXT PRIMARY KEY, actor_user_id TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
    action TEXT NOT NULL, reason TEXT NOT NULL, before_json TEXT NOT NULL, after_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(actor_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, actor_user_id TEXT, business_id TEXT, action TEXT NOT NULL,
    target_type TEXT NOT NULL, target_id TEXT NOT NULL, reason TEXT, before_json TEXT,
    after_json TEXT, ip_hash TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(actor_user_id) REFERENCES users(id), FOREIGN KEY(business_id) REFERENCES businesses(id)
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    price_uzs INTEGER NOT NULL DEFAULT 0, billing_period TEXT NOT NULL DEFAULT 'MONTHLY',
    description TEXT NOT NULL DEFAULT '', features_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1, updated_by_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  // Admin/operator accounts are deliberately separate from the marketplace `users` table:
  // sign-in is a dedicated phone + Telegram OTP flow, independent of the customer/business identity source.
  `CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','MANAGER','ACCOUNTANT')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED')),
    telegram_chat_id TEXT, created_by_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by_id) REFERENCES admin_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS admin_otp_codes (
    id TEXT PRIMARY KEY, admin_user_id TEXT NOT NULL, code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_user_id) REFERENCES admin_users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_otp_admin_created ON admin_otp_codes(admin_user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY, admin_user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL, revoked_at TEXT, user_agent TEXT, ip_hash TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_user_id) REFERENCES admin_users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_user_id, revoked_at)`,
  `CREATE TABLE IF NOT EXISTS admin_announcements (
    id TEXT PRIMARY KEY, actor_admin_id TEXT NOT NULL, deal_id TEXT,
    message TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('SENT','FAILED')),
    error TEXT, telegram_message_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(actor_admin_id) REFERENCES admin_users(id), FOREIGN KEY(deal_id) REFERENCES deals(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_announcements_created ON admin_announcements(created_at)`,
  `CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL, deal_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, deal_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(deal_id) REFERENCES deals(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_favorites_deal ON favorites(deal_id)`,
  // Every "Bog'lanish" submission and every AI Yordamchi lead lands here for admin to work — see /admin/support.
  `CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'CONTACT_FORM' CHECK(source IN ('CONTACT_FORM','AI_ASSISTANT')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','RESOLVED')),
    resolved_by_admin_id TEXT, resolution_note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(resolved_by_admin_id) REFERENCES admin_users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at)`,
  // A review requires owning a COMPLETED redemption (redemption_id UNIQUE) — no review without a real, staff-confirmed visit.
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY, business_id TEXT NOT NULL, user_id TEXT NOT NULL, redemption_id TEXT NOT NULL UNIQUE,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(business_id) REFERENCES businesses(id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(redemption_id) REFERENCES redemptions(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK(discount_type IN ('PERCENT','FIXED')), discount_value INTEGER NOT NULL,
    max_uses INTEGER, used_count INTEGER NOT NULL DEFAULT 0, expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, created_by_admin_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by_admin_id) REFERENCES admin_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS promo_code_redemptions (
    promo_code_id TEXT NOT NULL, user_id TEXT NOT NULL, redemption_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(promo_code_id, user_id),
    FOREIGN KEY(promo_code_id) REFERENCES promo_codes(id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(redemption_id) REFERENCES redemptions(id)
  )`,
  // "Auto Skidka": time-boxed discount steps for one deal (e.g. -10% then -20% then -30% as the window progresses).
  // synced automatically by syncAutoDiscountTiers() alongside the deal status lifecycle — see below.
  `CREATE TABLE IF NOT EXISTS deal_discount_tiers (
    id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
    discount_percent INTEGER NOT NULL CHECK(discount_percent BETWEEN 1 AND 95),
    FOREIGN KEY(deal_id) REFERENCES deals(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_deal_discount_tiers_deal ON deal_discount_tiers(deal_id, starts_at)`,
  // Time-slot booking for services (a haircut at 15:00, a car wash bay at 16:00, …) — a deal with rows here
  // is a "xizmat" (service) booked by slot instead of by a flat quantity counter.
  `CREATE TABLE IF NOT EXISTS deal_time_slots (
    id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, starts_at TEXT NOT NULL,
    capacity INTEGER NOT NULL, remaining_capacity INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deal_id) REFERENCES deals(id), CHECK(remaining_capacity >= 0 AND remaining_capacity <= capacity)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_deal_time_slots_deal ON deal_time_slots(deal_id, starts_at)`,
];

const seedStatements = [
  `INSERT OR IGNORE INTO users(id, role, phone, email, display_name) VALUES
    ('usr_customer_demo', 'CUSTOMER', '+998901234567', 'customer@bugunbor.dev', 'Aziza Karimova'),
    ('usr_owner_demo', 'BUSINESS_OWNER', '+998909876543', 'owner@bugunbor.dev', 'Sardor Raximov'),
    ('usr_moderator_demo', 'MODERATOR', '+998901110022', 'moderator@bugunbor.dev', 'Madina Qodirova'),
    ('usr_admin_demo', 'ADMIN', '+998901110033', 'admin@bugunbor.dev', 'Kamol Sodiqov')`,
  `INSERT OR IGNORE INTO categories(id, slug, name_uz, icon, sort_order) VALUES
    ('cat_food', 'taomlar', 'Taomlar', 'utensils', 10),
    ('cat_coffee', 'kofe', 'Kofe', 'coffee', 20),
    ('cat_shop', 'xaridlar', 'Xaridlar', 'shopping-bag', 30),
    ('cat_delivery', 'yetkazish', 'Yetkazish', 'bike', 40)`,
  `INSERT OR IGNORE INTO businesses(id, slug, name, description, city, category_id, phone, verification_status, rating_basis_points, review_count) VALUES
    ('biz_besh_qozon', 'besh-qozon', 'Besh Qozon', 'Toshkent palovi va milliy taomlar.', 'Toshkent', 'cat_food', '+998712005005', 'VERIFIED', 487, 1240),
    ('biz_safia', 'safia', 'Safia', 'Har kuni yangi pishiriq va tortlar.', 'Toshkent', 'cat_food', '+998712020202', 'VERIFIED', 474, 890),
    ('biz_bookuz', 'bookuz', 'Book.uz', 'Kitoblar, sovg‘alar va foydali to‘plamlar.', 'Toshkent', 'cat_shop', '+998712030303', 'VERIFIED', 469, 512),
    ('biz_anhor', 'anhor-lokomotiv', 'Anhor Lokomotiv', 'Oilaviy restoran va tezkor tushliklar.', 'Toshkent', 'cat_food', '+998712040404', 'VERIFIED', 481, 708)`,
  `INSERT OR IGNORE INTO business_members(business_id, user_id, role) VALUES ('biz_besh_qozon', 'usr_owner_demo', 'OWNER')`,
  `INSERT OR IGNORE INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, phone, working_hours_json) VALUES
    ('br_besh_yunusobod', 'biz_besh_qozon', 'Yunusobod filiali', 'Toshkent', 'Amir Temur shoh ko‘chasi, 108', 41349300, 69287200, '+998712005005', '{"mon-sun":"10:00-23:00"}'),
    ('br_safia_chilonzor', 'biz_safia', 'Chilonzor 19-kvartal', 'Toshkent', 'Bunyodkor shoh ko‘chasi, 52', 41285000, 69222000, '+998712020202', '{"mon-sun":"08:00-22:00"}'),
    ('br_book_samarkand', 'biz_bookuz', 'Samarqand Darvoza', 'Toshkent', 'Qoratosh ko‘chasi, 5A', 41316800, 69230800, '+998712030303', '{"mon-sun":"10:00-22:00"}'),
    ('br_anhor_main', 'biz_anhor', 'Anhor filiali', 'Toshkent', 'Labzak ko‘chasi, 12/1', 41331600, 69266400, '+998712040404', '{"mon-sun":"09:00-23:00"}')`,
  `INSERT OR IGNORE INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs, discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id) VALUES
    ('deal_osh', 'biz_besh_qozon', 'cat_food', 'toy-oshi-chegirma', 'To‘y oshi va achchiq-chuchuk', 'Bir porsiya to‘y oshi, salat va issiq non.', 'Faqat Yunusobod filialida. Boshqa chegirmalar bilan qo‘shilmaydi.', 65000, 39000, 40, datetime('now','-1 hour'), datetime('now','+2 hour'), 40, 18, 1, 'ONSITE_CODE', 'ACTIVE', 'usr_owner_demo'),
    ('deal_cake', 'biz_safia', 'cat_food', 'kechki-tort-chegirmasi', 'Tortlar uchun kechki chegirma', 'Bugun tayyorlangan tanlangan tortlarga maxsus narx.', 'Mavjud assortimentdan. Oldindan buyurtmaga tatbiq etilmaydi.', 120000, 84000, 30, datetime('now','-1 hour'), datetime('now','+4 hour'), 20, 7, 1, 'ONSITE_CODE', 'ACTIVE', 'usr_owner_demo'),
    ('deal_books', 'biz_bookuz', 'cat_shop', 'biznes-kitoblar-toplami', 'Biznes kitoblar to‘plami', 'Uchta mashhur biznes kitobi bitta jamlanmada.', 'Samarqand Darvoza filialidan olib ketish.', 185000, 129000, 30, datetime('now','-2 hour'), datetime('now','+6 hour'), 25, 11, 1, 'ONLINE_VOUCHER', 'ACTIVE', 'usr_owner_demo'),
    ('deal_lagmon', 'biz_anhor', 'cat_food', 'lagmon-salat-kombo', 'Lag‘mon va salat kombo', 'Issiq lag‘mon va yangi sabzavotli salat.', 'Restoranda iste’mol qilish uchun. Bir mijozga bir marta.', 65000, 42000, 35, datetime('now','-1 hour'), datetime('now','+50 minute'), 35, 13, 1, 'ONSITE_CODE', 'ACTIVE', 'usr_owner_demo'),
    ('deal_pending', 'biz_besh_qozon', 'cat_food', 'oilaviy-osh-seti', 'Oilaviy osh seti', 'To‘rt kishilik palov, salatlar va issiq non.', 'Faqat ish kunlari. Oldindan band qilish talab etiladi.', 280000, 210000, 25, datetime('now','+1 hour'), datetime('now','+2 day'), 30, 30, 1, 'ONSITE_CODE', 'PENDING_REVIEW', 'usr_owner_demo')`,
  `INSERT OR IGNORE INTO deal_branches(deal_id, branch_id) VALUES
    ('deal_osh', 'br_besh_yunusobod'), ('deal_cake', 'br_safia_chilonzor'),
    ('deal_books', 'br_book_samarkand'), ('deal_lagmon', 'br_anhor_main'),
    ('deal_pending', 'br_besh_yunusobod')`,
  `INSERT OR IGNORE INTO plans(id, code, name, price_uzs, billing_period, description, features_json, is_active) VALUES
    ('plan_free', 'FREE', 'Bepul', 0, 'MONTHLY', 'Yangi bizneslar uchun boshlang‘ich reja.',
      '["1 ta faol filial","Bir vaqtda 2 tagacha faol aksiya","Standart ko‘rinish"]', 1),
    ('plan_pro', 'PRO', 'Pro', 199000, 'MONTHLY', 'O‘sayotgan bizneslar uchun kengaytirilgan reja.',
      '["Cheksiz filial va aksiya","Qidiruvda ustuvor (sponsored) joylashuv","Batafsil analitika","Ustuvor qo‘llab-quvvatlash"]', 1)`,
];

/**
 * Columns added after the initial schema; applied with ALTER so existing D1
 * databases upgrade in place. `plan_id` is intentionally nullable here — SQLite
 * refuses `ALTER TABLE ADD COLUMN` on a REFERENCES column that also carries a
 * non-NULL default — and backfilled to 'plan_free' below instead. Every write
 * path (onboarding, admin plan assignment) always supplies a real plan_id.
 */
const columnMigrations: Array<{ table: string; column: string; ddl: string }> = [
  { table: 'businesses', column: 'plan_id', ddl: `TEXT REFERENCES plans(id)` },
  { table: 'businesses', column: 'subscription_status', ddl: `TEXT NOT NULL DEFAULT 'FREE'` },
  { table: 'businesses', column: 'region', ddl: `TEXT` },
  { table: 'branches', column: 'region', ddl: `TEXT` },
  { table: 'deals', column: 'listing_type', ddl: `TEXT NOT NULL DEFAULT 'PRODUCT'` },
  { table: 'deals', column: 'min_price_uzs', ddl: `INTEGER` },
  { table: 'redemptions', column: 'time_slot_id', ddl: `TEXT REFERENCES deal_time_slots(id)` },
  { table: 'redemptions', column: 'promo_code_id', ddl: `TEXT REFERENCES promo_codes(id)` },
  { table: 'redemptions', column: 'final_price_uzs', ddl: `INTEGER` },
];

let ready: Promise<void> | undefined;

export function getD1() {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

export async function ensurePhase1Database() {
  ready ??= (async () => {
    const db = getD1();
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
    for (const { table, column, ddl } of columnMigrations) {
      try {
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
      } catch (error) {
        // SQLite has no "ADD COLUMN IF NOT EXISTS" — a "duplicate column" error just
        // means a previous boot already applied this migration. Anything else is a
        // real problem (bad DDL, missing referenced table) and must not be swallowed,
        // or every query against the missing column would fail later with a much
        // more confusing error.
        if (!(error instanceof Error) || !/duplicate column/i.test(error.message)) throw error;
      }
    }
    await db.batch(seedStatements.map((statement) => db.prepare(statement)));
    // Backfill after seeding plans, so 'plan_free' already exists to reference.
    await db.prepare(`UPDATE businesses SET plan_id = 'plan_free' WHERE plan_id IS NULL`).run();
    // Every seed record predates the region column — they're all Tashkent-city demo data.
    await db.prepare(`UPDATE businesses SET region = 'Toshkent shahri' WHERE region IS NULL AND city = 'Toshkent'`).run();
    await db.prepare(`UPDATE branches SET region = 'Toshkent shahri' WHERE region IS NULL AND city = 'Toshkent'`).run();
    await seedBootstrapAdmin(db);
    await db.prepare('PRAGMA optimize').run();
  })();
  return ready;
}

/**
 * Advances every deal's `status` to match its schedule and stock, without any
 * background job or Cron Trigger: SCHEDULED -> ACTIVE once starts_at arrives,
 * ACTIVE/SCHEDULED -> EXPIRED once ends_at passes, ACTIVE -> SOLD_OUT once
 * remaining_quantity hits zero (a backstop — the claim endpoint already sets
 * this inline, atomically, at the moment a claim empties the last unit).
 *
 * Called at the top of every read path that shows deal status (public
 * listings, business dashboard, admin businesses/dashboard), so the stored
 * status is always correct by the time anyone looks at it — "the server
 * does it, the business doesn't have to open the app" — without depending
 * on Cloudflare Cron Triggers, which vinext's build does not expose a
 * supported way to hook a `scheduled()` handler into.
 */
export async function syncDealLifecycle() {
  const db = getD1();
  await db.batch([
    db.prepare(`UPDATE deals SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'SCHEDULED' AND deleted_at IS NULL
        AND datetime(starts_at) <= datetime('now') AND datetime(ends_at) > datetime('now')`),
    db.prepare(`UPDATE deals SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('ACTIVE', 'SCHEDULED') AND deleted_at IS NULL AND datetime(ends_at) <= datetime('now')`),
    db.prepare(`UPDATE deals SET status = 'SOLD_OUT', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'ACTIVE' AND deleted_at IS NULL AND remaining_quantity = 0`),
  ]);
  await syncAutoDiscountTiers(db);
}

/**
 * "Auto Skidka": a business can schedule a deal's discount to deepen in
 * steps as its window progresses (e.g. -10% then -20% then -30%) instead of
 * a single fixed price for the whole run. Computed in application code
 * rather than one clever correlated SQL UPDATE — easier to get right and to
 * verify — and folded into syncDealLifecycle() so it runs everywhere that
 * already does, with no extra call sites to remember.
 */
async function syncAutoDiscountTiers(db: D1Database) {
  const rows = await db
    .prepare(`
      SELECT dt.deal_id AS dealId, dt.discount_percent AS tierDiscountPercent,
        d.original_price_uzs AS originalPriceUzs, d.min_price_uzs AS minPriceUzs, d.discount_percent AS currentDiscountPercent
      FROM deal_discount_tiers dt
      JOIN deals d ON d.id = dt.deal_id
      WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL AND d.original_price_uzs IS NOT NULL
        AND datetime('now') >= datetime(dt.starts_at) AND datetime('now') < datetime(dt.ends_at)
    `)
    .all<{ dealId: string; tierDiscountPercent: number; originalPriceUzs: number; minPriceUzs: number | null; currentDiscountPercent: number }>();

  const statements = rows.results.flatMap((row) => {
    const rawPrice = Math.round((row.originalPriceUzs * (100 - row.tierDiscountPercent)) / 100);
    const finalPrice = row.minPriceUzs ? Math.max(rawPrice, row.minPriceUzs) : rawPrice;
    const finalPercent = Math.round(((row.originalPriceUzs - finalPrice) / row.originalPriceUzs) * 100);
    if (finalPercent === row.currentDiscountPercent) return [];
    return [db.prepare(`UPDATE deals SET discounted_price_uzs = ?1, discount_percent = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3`).bind(finalPrice, finalPercent, row.dealId)];
  });
  if (statements.length) await db.batch(statements);
}

/**
 * Seeds the first SUPER_ADMIN so a fresh deployment always has one working login.
 * Configure ADMIN_BOOTSTRAP_PHONE / ADMIN_BOOTSTRAP_TELEGRAM_CHAT_ID before going live —
 * without a real Telegram chat id this account exists but cannot receive login codes.
 */
async function seedBootstrapAdmin(db: D1Database) {
  const phone = env.ADMIN_BOOTSTRAP_PHONE || '+998900000000';
  const telegramChatId = env.ADMIN_BOOTSTRAP_TELEGRAM_CHAT_ID || null;
  await db
    .prepare(`INSERT INTO admin_users(id, phone, display_name, role, status, telegram_chat_id)
      VALUES ('admin_bootstrap', ?1, 'Bosh admin', 'SUPER_ADMIN', 'ACTIVE', ?2)
      ON CONFLICT(id) DO UPDATE SET phone = excluded.phone, telegram_chat_id = excluded.telegram_chat_id, updated_at = CURRENT_TIMESTAMP`)
    .bind(phone, telegramChatId)
    .run();
  await mirrorAdminAsPlatformUser(db, { id: 'admin_bootstrap', displayName: 'Bosh admin', role: 'SUPER_ADMIN' });
}

/**
 * `moderation_actions` and `audit_logs` record their actor via a foreign key
 * into the marketplace `users` table, since that's the shared identity used
 * by every other actor (moderators, business owners) writing those tables.
 * Admin-panel accounts live in `admin_users` instead (see modules/admin/auth),
 * so a lightweight mirror row keeps that foreign key satisfied whenever an
 * admin performs an action worth auditing. The mirror is intentionally
 * phone-less (NULL) so it can never collide with a real customer/business
 * account that happens to share the same phone number.
 */
export async function mirrorAdminAsPlatformUser(
  db: D1Database,
  input: { id: string; displayName: string; role: 'MANAGER' | 'ACCOUNTANT' | 'SUPER_ADMIN' },
) {
  const platformRole = input.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : input.role === 'MANAGER' ? 'ADMIN' : 'MODERATOR';
  await db
    .prepare(`INSERT INTO users(id, role, display_name)
      VALUES (?1, ?2, ?3)
      ON CONFLICT(id) DO UPDATE SET role = excluded.role, display_name = excluded.display_name, updated_at = CURRENT_TIMESTAMP`)
    .bind(input.id, platformRole, input.displayName)
    .run();
}
