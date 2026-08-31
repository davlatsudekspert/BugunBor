// `pg` ships as CommonJS with no ESM named exports, so its constructors must
// come from the default export — `import { Pool } from 'pg'` fails under
// Node's strict ESM interop once this is bundled for the production server.
// The type-only names, however, resolve fine as named imports.
import pg from 'pg';
import type { Pool as PgPool, PoolClient } from 'pg';

import { toStoredUtc } from '@/lib/time';

const { Pool } = pg;

// --- Postgres connection -----------------------------------------------------
//
// Railway (and most hosted Postgres providers) inject a single DATABASE_URL.
// Their *public* endpoints generally require TLS (visible as `sslmode=require`
// in the URL); the *internal*/private-network URL Railway gives same-project
// services does not use TLS at all. We honor whichever the URL asks for
// instead of hardcoding one or the other.
function resolveSsl(connectionString: string) {
  if (/sslmode=disable/i.test(connectionString)) return false;
  if (/sslmode=(require|verify-full|verify-ca)/i.test(connectionString)) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

let pool: PgPool | undefined;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is unavailable. Set it to a Postgres connection string ' +
          '(see .env.example and docs/operations.md for Railway setup).',
      );
    }
    pool = new Pool({ connectionString, ssl: resolveSsl(connectionString) });
  }
  return pool;
}

// --- A tiny D1-shaped query wrapper over `pg` ---------------------------------
//
// Every call site in this app was written against Cloudflare D1's
// `db.prepare(sql).bind(...args).first()/.all()/.run()` and `db.batch([...])`
// API. Reproducing that shape here — rather than rewriting every call site to
// a different client API — kept the Postgres migration to "port the SQL text,
// not the surrounding control flow". `?1`, `?2`, ... placeholders (D1's
// convention, and this codebase's) are translated to Postgres's `$1`, `$2`,
// ... automatically; the numbering semantics are identical (1-indexed,
// reusable), so no call site needed its placeholders renumbered.

type Row = Record<string, unknown>;

function toPgPlaceholders(sql: string) {
  return sql.replace(/\?(\d+)/g, '$$$1');
}

class PreparedStatement {
  readonly text: string;
  params: unknown[] = [];

  constructor(
    private readonly runner: PgPool | PoolClient,
    sql: string,
  ) {
    this.text = toPgPlaceholders(sql);
  }

  bind(...args: unknown[]) {
    this.params = args;
    return this;
  }

  async first<T = Row>(): Promise<T | null> {
    const result = await this.runner.query(this.text, this.params);
    return (result.rows[0] as T | undefined) ?? null;
  }

  async all<T = Row>(): Promise<{ results: T[] }> {
    const result = await this.runner.query(this.text, this.params);
    return { results: result.rows as T[] };
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const result = await this.runner.query(this.text, this.params);
    return { meta: { changes: result.rowCount ?? 0 } };
  }
}

class Database {
  constructor(private readonly runner: PgPool | PoolClient) {}

  prepare(sql: string) {
    return new PreparedStatement(this.runner, sql);
  }

  /** Runs every statement sequentially inside one transaction, mirroring D1's
   * batch semantics (all-or-nothing, results returned in call order). Each
   * statement's already-translated `text`/`params` are replayed on a single
   * dedicated client so the whole batch shares one transaction. */
  async batch(statements: PreparedStatement[]) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const results: { meta: { changes: number } }[] = [];
      for (const statement of statements) {
        const result = await client.query(statement.text, statement.params);
        results.push({ meta: { changes: result.rowCount ?? 0 } });
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

let dbSingleton: Database | undefined;

export function getDb() {
  dbSingleton ??= new Database(getPool());
  return dbSingleton;
}

// --- Schema + seed ------------------------------------------------------------

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
    deal_type TEXT NOT NULL DEFAULT 'PRODUCT', title TEXT NOT NULL, description TEXT NOT NULL, terms TEXT NOT NULL,
    original_price_uzs INTEGER, discounted_price_uzs INTEGER NOT NULL, discount_percent INTEGER NOT NULL,
    starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, total_quantity INTEGER, remaining_quantity INTEGER,
    per_customer_limit INTEGER NOT NULL DEFAULT 1, redemption_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', attributes_json TEXT NOT NULL DEFAULT '{}',
    is_sponsored INTEGER NOT NULL DEFAULT 0,
    created_by_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT,
    UNIQUE(business_id, slug), FOREIGN KEY(business_id) REFERENCES businesses(id),
    FOREIGN KEY(category_id) REFERENCES categories(id), FOREIGN KEY(created_by_id) REFERENCES users(id),
    CHECK(ends_at > starts_at), CHECK(remaining_quantity IS NULL OR remaining_quantity >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_deals_public_window ON deals(status, starts_at, ends_at)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_category_status ON deals(category_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_type_status ON deals(deal_type, status)`,
  `CREATE TABLE IF NOT EXISTS deal_branches (
    deal_id TEXT NOT NULL, branch_id TEXT NOT NULL, capacity INTEGER,
    PRIMARY KEY(deal_id, branch_id), FOREIGN KEY(deal_id) REFERENCES deals(id), FOREIGN KEY(branch_id) REFERENCES branches(id)
  )`,
  `CREATE TABLE IF NOT EXISTS deal_images (
    id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, url TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
    is_cover INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deal_id) REFERENCES deals(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_deal_images_deal ON deal_images(deal_id, sort_order)`,
  `CREATE TABLE IF NOT EXISTS service_slots (
    id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, starts_at TEXT NOT NULL,
    capacity INTEGER NOT NULL, remaining_capacity INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    CHECK(remaining_capacity >= 0 AND remaining_capacity <= capacity)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_service_slots_deal_starts ON service_slots(deal_id, starts_at)`,
  `CREATE TABLE IF NOT EXISTS redemptions (
    id TEXT PRIMARY KEY, deal_id TEXT NOT NULL, branch_id TEXT NOT NULL, user_id TEXT NOT NULL,
    slot_id TEXT, idempotency_key TEXT NOT NULL UNIQUE, code_hash TEXT NOT NULL UNIQUE, code_hint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CLAIMED', expires_at TEXT NOT NULL, completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deal_id) REFERENCES deals(id), FOREIGN KEY(branch_id) REFERENCES branches(id),
    FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(slot_id) REFERENCES service_slots(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_redemptions_deal_status ON redemptions(deal_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_redemptions_slot ON redemptions(slot_id)`,
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

/** Offset from "now", formatted as the naive-UTC string every timestamp
 * column in this app uses (see lib/time.ts). Used only to build seed data. */
function offset(ms: number) {
  return toStoredUtc(new Date(Date.now() + ms).toISOString());
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const DAY = 24 * HOUR;

function seedStatements() {
  return [
    `INSERT INTO users(id, role, phone, email, display_name) VALUES
      ('usr_customer_demo', 'CUSTOMER', '+998901234567', 'customer@bugunbor.dev', 'Aziza Karimova'),
      ('usr_owner_demo', 'BUSINESS_OWNER', '+998909876543', 'owner@bugunbor.dev', 'Sardor Raximov'),
      ('usr_moderator_demo', 'MODERATOR', '+998901110022', 'moderator@bugunbor.dev', 'Madina Qodirova'),
      ('usr_admin_demo', 'ADMIN', '+998901110033', 'admin@bugunbor.dev', 'Kamol Sodiqov')
      ON CONFLICT DO NOTHING`,
    `INSERT INTO categories(id, slug, name_uz, icon, sort_order) VALUES
      ('cat_food', 'taomlar', 'Taomlar', 'utensils', 10),
      ('cat_coffee', 'kofe', 'Kofe', 'coffee', 20),
      ('cat_shop', 'xaridlar', 'Xaridlar', 'shopping-bag', 30),
      ('cat_delivery', 'yetkazish', 'Yetkazish', 'bike', 40),
      ('cat_service', 'xizmatlar', 'Xizmatlar', 'scissors', 50)
      ON CONFLICT DO NOTHING`,
    `INSERT INTO businesses(id, slug, name, description, city, category_id, phone, verification_status, rating_basis_points, review_count) VALUES
      ('biz_besh_qozon', 'besh-qozon', 'Besh Qozon', 'Toshkent palovi va milliy taomlar.', 'Toshkent', 'cat_food', '+998712005005', 'VERIFIED', 487, 1240),
      ('biz_safia', 'safia', 'Safia', 'Har kuni yangi pishiriq va tortlar.', 'Toshkent', 'cat_food', '+998712020202', 'VERIFIED', 474, 890),
      ('biz_bookuz', 'bookuz', 'Book.uz', 'Kitoblar, sovg‘alar va foydali to‘plamlar.', 'Toshkent', 'cat_shop', '+998712030303', 'VERIFIED', 469, 512),
      ('biz_anhor', 'anhor-lokomotiv', 'Anhor Lokomotiv', 'Oilaviy restoran va tezkor tushliklar.', 'Toshkent', 'cat_food', '+998712040404', 'VERIFIED', 481, 708),
      ('biz_barber_house', 'barber-house', 'Barber House', 'Erkaklar sartaroshxonasi va soqol olish xizmati.', 'Toshkent', 'cat_service', '+998712050505', 'VERIFIED', 490, 356)
      ON CONFLICT DO NOTHING`,
    `INSERT INTO business_members(business_id, user_id, role) VALUES ('biz_besh_qozon', 'usr_owner_demo', 'OWNER') ON CONFLICT DO NOTHING`,
    `INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, phone, working_hours_json) VALUES
      ('br_besh_yunusobod', 'biz_besh_qozon', 'Yunusobod filiali', 'Toshkent', 'Amir Temur shoh ko‘chasi, 108', 41349300, 69287200, '+998712005005', '{"mon-sun":"10:00-23:00"}'),
      ('br_safia_chilonzor', 'biz_safia', 'Chilonzor 19-kvartal', 'Toshkent', 'Bunyodkor shoh ko‘chasi, 52', 41285000, 69222000, '+998712020202', '{"mon-sun":"08:00-22:00"}'),
      ('br_book_samarkand', 'biz_bookuz', 'Samarqand Darvoza', 'Toshkent', 'Qoratosh ko‘chasi, 5A', 41316800, 69230800, '+998712030303', '{"mon-sun":"10:00-22:00"}'),
      ('br_anhor_main', 'biz_anhor', 'Anhor filiali', 'Toshkent', 'Labzak ko‘chasi, 12/1', 41331600, 69266400, '+998712040404', '{"mon-sun":"09:00-23:00"}'),
      ('br_barber_yakkasaray', 'biz_barber_house', 'Yakkasaroy filiali', 'Toshkent', 'Shota Rustaveli ko‘chasi, 21', 41293400, 69258700, '+998712050505', '{"mon-sun":"09:00-21:00"}')
      ON CONFLICT DO NOTHING`,
    `INSERT INTO deals(id, business_id, category_id, slug, deal_type, title, description, terms, original_price_uzs, discounted_price_uzs, discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, attributes_json, created_by_id) VALUES
      ('deal_osh', 'biz_besh_qozon', 'cat_food', 'toy-oshi-chegirma', 'PRODUCT', 'To‘y oshi va achchiq-chuchuk', 'Bir porsiya to‘y oshi, salat va issiq non.', 'Faqat Yunusobod filialida. Boshqa chegirmalar bilan qo‘shilmaydi.', 65000, 39000, 40, '${offset(-1 * HOUR)}', '${offset(2 * HOUR)}', 40, 18, 1, 'ONSITE_CODE', 'ACTIVE', '{}', 'usr_owner_demo'),
      ('deal_cake', 'biz_safia', 'cat_food', 'kechki-tort-chegirmasi', 'PRODUCT', 'Tortlar uchun kechki chegirma', 'Bugun tayyorlangan tanlangan tortlarga maxsus narx.', 'Mavjud assortimentdan. Oldindan buyurtmaga tatbiq etilmaydi.', 120000, 84000, 30, '${offset(-1 * HOUR)}', '${offset(4 * HOUR)}', 20, 7, 1, 'ONSITE_CODE', 'ACTIVE', '{}', 'usr_owner_demo'),
      ('deal_books', 'biz_bookuz', 'cat_shop', 'biznes-kitoblar-toplami', 'PRODUCT', 'Biznes kitoblar to‘plami', 'Uchta mashhur biznes kitobi bitta jamlanmada.', 'Samarqand Darvoza filialidan olib ketish.', 185000, 129000, 30, '${offset(-2 * HOUR)}', '${offset(6 * HOUR)}', 25, 11, 1, 'ONLINE_VOUCHER', 'ACTIVE', '{"holati":"Yangi"}', 'usr_owner_demo'),
      ('deal_lagmon', 'biz_anhor', 'cat_food', 'lagmon-salat-kombo', 'PRODUCT', 'Lag‘mon va salat kombo', 'Issiq lag‘mon va yangi sabzavotli salat.', 'Restoranda iste’mol qilish uchun. Bir mijozga bir marta.', 65000, 42000, 35, '${offset(-1 * HOUR)}', '${offset(50 * MINUTE)}', 35, 13, 1, 'ONSITE_CODE', 'ACTIVE', '{}', 'usr_owner_demo'),
      ('deal_pending', 'biz_besh_qozon', 'cat_food', 'oilaviy-osh-seti', 'PRODUCT', 'Oilaviy osh seti', 'To‘rt kishilik palov, salatlar va issiq non.', 'Faqat ish kunlari. Oldindan band qilish talab etiladi.', 280000, 210000, 25, '${offset(1 * HOUR)}', '${offset(2 * DAY)}', 30, 30, 1, 'ONSITE_CODE', 'PENDING_REVIEW', '{}', 'usr_owner_demo'),
      ('deal_barber', 'biz_barber_house', 'cat_service', 'premium-soch-oldirish', 'SERVICE', 'Premium soch oldirish + soqol', 'Soch olish, soqol tarashi va issiq sochiq bilan yuz parvarishi.', 'Faqat Yakkasaroy filialida. Bron qilingan vaqtga kelish shart.', 150000, 99000, 34, '${offset(-1 * HOUR)}', '${offset(5 * HOUR)}', NULL, NULL, 1, 'ONSITE_CODE', 'ACTIVE', '{}', 'usr_owner_demo')
      ON CONFLICT DO NOTHING`,
    `INSERT INTO deal_branches(deal_id, branch_id) VALUES
      ('deal_osh', 'br_besh_yunusobod'), ('deal_cake', 'br_safia_chilonzor'),
      ('deal_books', 'br_book_samarkand'), ('deal_lagmon', 'br_anhor_main'),
      ('deal_pending', 'br_besh_yunusobod'), ('deal_barber', 'br_barber_yakkasaray')
      ON CONFLICT DO NOTHING`,
    `INSERT INTO deal_images(id, deal_id, url, sort_order, is_cover) VALUES
      ('img_osh_1', 'deal_osh', '/og.png', 0, 1),
      ('img_barber_1', 'deal_barber', '/og.png', 0, 1)
      ON CONFLICT DO NOTHING`,
    `INSERT INTO service_slots(id, deal_id, starts_at, capacity, remaining_capacity) VALUES
      ('slot_barber_1', 'deal_barber', '${offset(1 * HOUR)}', 1, 1),
      ('slot_barber_2', 'deal_barber', '${offset(2 * HOUR)}', 2, 2),
      ('slot_barber_3', 'deal_barber', '${offset(3 * HOUR)}', 1, 0)
      ON CONFLICT DO NOTHING`,
  ];
}

let ready: Promise<void> | undefined;

export async function ensureDatabase() {
  ready ??= (async () => {
    const db = getDb();
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
    await db.batch(seedStatements().map((statement) => db.prepare(statement)));
  })();
  return ready;
}
