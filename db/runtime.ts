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
    await db.batch(seedStatements.map((statement) => db.prepare(statement)));
    await db.prepare('PRAGMA optimize').run();
  })();
  return ready;
}
