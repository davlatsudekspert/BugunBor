import { buildSearchText } from '@/lib/search';

export type MigrationContext = {
  db: D1Database;
  columns: (table: string) => Promise<Set<string>>;
};

export type Migration = {
  id: string;
  /** Builds the statements for this migration. They run in one atomic batch. */
  build(context: MigrationContext): Promise<D1PreparedStatement[]>;
};

const sql = (db: D1Database, statements: string[]) => statements.map((statement) => db.prepare(statement));

/** Phase 1 tables exactly as the first deployed checkpoint created them. */
const baseline: Migration = {
  id: '0001_baseline',
  async build({ db }) {
    return sql(db, [
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
    ]);
  },
};

/** Phase 1 seed rows. They use real brand names, so they are renamed and hidden as demo data. */
const LEGACY_DEMO = {
  users: ['usr_customer_demo', 'usr_owner_demo', 'usr_moderator_demo', 'usr_admin_demo'],
  businesses: [
    { id: 'biz_besh_qozon', name: 'Oltin Qozon', slug: 'oltin-qozon', description: 'Toshkent palovi va milliy taomlar.' },
    { id: 'biz_safia', name: 'Shirin Lahza', slug: 'shirin-lahza', description: 'Har kuni yangi pishiriq va tortlar.' },
    { id: 'biz_bookuz', name: 'Kitob Uyi', slug: 'kitob-uyi', description: 'Kitoblar, sovg‘alar va foydali to‘plamlar.' },
    { id: 'biz_anhor', name: 'Bog‘ Choyxona', slug: 'bog-choyxona', description: 'Oilaviy choyxona va tezkor tushliklar.' },
  ],
  deals: ['deal_osh', 'deal_cake', 'deal_books', 'deal_lagmon', 'deal_pending'],
};

const systemV1: Migration = {
  id: '0002_system_v1',
  async build({ db, columns }) {
    const statements: D1PreparedStatement[] = [];
    const addColumns = async (table: string, definitions: Record<string, string>) => {
      const existing = await columns(table);
      for (const [name, definition] of Object.entries(definitions)) {
        if (!existing.has(name)) statements.push(db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`));
      }
    };

    await addColumns('users', {
      phone_verified_at: 'TEXT',
      telegram_user_id: 'TEXT',
      telegram_username: 'TEXT',
      last_login_at: 'TEXT',
    });
    await addColumns('categories', { name_ru: 'TEXT' });
    await addColumns('businesses', {
      telegram: 'TEXT',
      instagram: 'TEXT',
      website: 'TEXT',
      rejection_reason: 'TEXT',
      submitted_at: 'TEXT',
      verified_at: 'TEXT',
      suspended_at: 'TEXT',
      suspended_reason: 'TEXT',
      is_demo: 'INTEGER NOT NULL DEFAULT 0',
      search_text: "TEXT NOT NULL DEFAULT ''",
    });
    await addColumns('business_members', { added_by_user_id: 'TEXT' });
    await addColumns('deals', {
      claim_ttl_minutes: 'INTEGER NOT NULL DEFAULT 120',
      visual: 'TEXT',
      rejection_reason: 'TEXT',
      submitted_at: 'TEXT',
      approved_at: 'TEXT',
      archived_at: 'TEXT',
      view_count: 'INTEGER NOT NULL DEFAULT 0',
      search_text: "TEXT NOT NULL DEFAULT ''",
      is_demo: 'INTEGER NOT NULL DEFAULT 0',
    });
    await addColumns('redemptions', {
      business_id: 'TEXT',
      completed_by_user_id: 'TEXT',
      canceled_at: 'TEXT',
      updated_at: 'TEXT',
    });

    statements.push(...sql(db, [
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT, user_agent TEXT, ip_hash TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked_at)`,
      `CREATE TABLE IF NOT EXISTS login_requests (
        id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, browser_hash TEXT NOT NULL,
        match_code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', return_to TEXT,
        locale TEXT NOT NULL DEFAULT 'uz', user_agent TEXT, ip_hash TEXT,
        telegram_user_id TEXT, telegram_chat_id TEXT, user_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL,
        approved_at TEXT, consumed_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_login_requests_expires ON login_requests(expires_at)`,
      `CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT NOT NULL, deal_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id, deal_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(deal_id) REFERENCES deals(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_favorites_deal ON favorites(deal_id)`,
      `CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, contact TEXT NOT NULL, subject TEXT NOT NULL,
        message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NEW', ip_hash TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, handled_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status, created_at)`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL
      )`,

      // Platform roles are CUSTOMER / MODERATOR / ADMIN; business access lives in business_members.
      `UPDATE users SET role = 'CUSTOMER' WHERE role IN ('BUSINESS_OWNER', 'BUSINESS_STAFF')`,
      `UPDATE users SET role = 'ADMIN' WHERE role = 'SUPER_ADMIN'`,
      `UPDATE users SET locale = 'uz' WHERE locale NOT IN ('uz', 'ru')`,
      `UPDATE business_members SET role = 'MANAGER' WHERE role IN ('DEAL_EDITOR', 'ANALYST')`,
      `UPDATE business_members SET role = 'CASHIER' WHERE role = 'REDEMPTION_STAFF'`,

      // Cities are stored as slugs.
      `UPDATE businesses SET city = CASE city WHEN 'Toshkent' THEN 'tashkent' WHEN 'Samarqand' THEN 'samarkand' WHEN 'Buxoro' THEN 'bukhara' ELSE city END`,
      `UPDATE branches SET city = CASE city WHEN 'Toshkent' THEN 'tashkent' WHEN 'Samarqand' THEN 'samarkand' WHEN 'Buxoro' THEN 'bukhara' ELSE city END`,
      `UPDATE businesses SET verification_status = 'PENDING' WHERE verification_status = 'UNVERIFIED'`,

      // Scheduled / sold out / expired are derived from time and quantity now.
      `UPDATE deals SET status = 'ACTIVE' WHERE status IN ('SCHEDULED', 'SOLD_OUT', 'EXPIRED')`,
      `UPDATE deals SET slug = slug || '-' || substr(id, 1, 6)
        WHERE id NOT IN (SELECT MIN(id) FROM deals GROUP BY slug)`,

      `UPDATE redemptions SET business_id = (SELECT business_id FROM deals WHERE deals.id = redemptions.deal_id) WHERE business_id IS NULL`,
      `UPDATE redemptions SET expires_at = datetime(expires_at) WHERE expires_at LIKE '%T%'`,
      `UPDATE redemptions SET status = 'EXPIRED'
        WHERE status = 'CLAIMED' AND rowid NOT IN (
          SELECT MIN(rowid) FROM redemptions WHERE status = 'CLAIMED' GROUP BY deal_id, user_id
        )`,

      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_unique ON users(telegram_user_id) WHERE telegram_user_id IS NOT NULL`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_slug_unique ON deals(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_deals_business_status ON deals(business_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(verification_status, suspended_at)`,
      `CREATE INDEX IF NOT EXISTS idx_redemptions_business ON redemptions(business_id, status, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_redemptions_expiry ON redemptions(status, expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(user_id, created_at)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_redemptions_one_active ON redemptions(deal_id, user_id) WHERE status = 'CLAIMED'`,
      // A code ends exactly once (used, cancelled or expired). Side effects in the
      // same batch are keyed on this event row, so retries can never repeat them.
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_redemption_terminal_event ON redemption_events(redemption_id) WHERE type IN ('COMPLETED', 'CANCELED', 'EXPIRED')`,
      `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`,
    ]));

    // Russian names for existing categories and the new categories.
    statements.push(...sql(db, [
      `UPDATE categories SET name_ru = CASE slug WHEN 'taomlar' THEN 'Еда' WHEN 'kofe' THEN 'Кофе' WHEN 'xaridlar' THEN 'Покупки' WHEN 'yetkazish' THEN 'Доставка' ELSE name_ru END WHERE name_ru IS NULL`,
      `INSERT OR IGNORE INTO categories(id, slug, name_uz, name_ru, icon, sort_order) VALUES
        ('cat_food', 'taomlar', 'Taomlar', 'Еда', 'utensils', 10),
        ('cat_coffee', 'kofe', 'Kofe', 'Кофе', 'coffee', 20),
        ('cat_shop', 'xaridlar', 'Xaridlar', 'Покупки', 'shopping-bag', 30),
        ('cat_beauty', 'gozallik', 'Go‘zallik', 'Красота', 'sparkles', 40),
        ('cat_sport', 'sport', 'Sport', 'Спорт', 'dumbbell', 50),
        ('cat_fun', 'kongilochar', 'Ko‘ngilochar', 'Развлечения', 'ticket', 60),
        ('cat_services', 'xizmatlar', 'Xizmatlar', 'Услуги', 'wrench', 70),
        ('cat_delivery', 'yetkazish', 'Yetkazish', 'Доставка', 'bike', 80)`,
    ]));

    // Legacy seed rows: no phone (so a real person can never inherit a demo role),
    // fictional names, and hidden from production listings.
    for (const id of LEGACY_DEMO.users) {
      statements.push(db.prepare(`UPDATE users SET phone = NULL WHERE id = ?1`).bind(id));
    }
    for (const business of LEGACY_DEMO.businesses) {
      statements.push(db.prepare(`UPDATE businesses SET name = ?2, slug = ?3, description = ?4, is_demo = 1 WHERE id = ?1`)
        .bind(business.id, business.name, business.slug, business.description));
    }
    for (const id of LEGACY_DEMO.deals) {
      statements.push(db.prepare(`UPDATE deals SET is_demo = 1 WHERE id = ?1`).bind(id));
    }

    // Search text for rows that exist before this migration.
    const legacyNames = new Map(LEGACY_DEMO.businesses.map((business) => [business.id, business]));
    const businesses = await db.prepare(`SELECT id, name, description FROM businesses`).all<{ id: string; name: string; description: string }>();
    for (const business of businesses.results) {
      const legacy = legacyNames.get(business.id);
      statements.push(db.prepare(`UPDATE businesses SET search_text = ?2 WHERE id = ?1`)
        .bind(business.id, buildSearchText(legacy?.name ?? business.name, legacy?.description ?? business.description)));
    }
    const deals = await db.prepare(`SELECT id, title, description FROM deals`).all<{ id: string; title: string; description: string }>();
    for (const deal of deals.results) {
      statements.push(db.prepare(`UPDATE deals SET search_text = ?2 WHERE id = ?1`).bind(deal.id, buildSearchText(deal.title, deal.description)));
    }

    return statements;
  },
};

/** Free trial (1–3 months) followed by paid package tariffs. See docs/TIZIM.md §6. */
const billing: Migration = {
  id: '0003_billing',
  async build({ db, columns }) {
    const statements: D1PreparedStatement[] = [];
    const existing = await columns('businesses');
    for (const [name, definition] of Object.entries({ plan_code: 'TEXT', trial_ends_at: 'TEXT', paid_until: 'TEXT' })) {
      if (!existing.has(name)) statements.push(db.prepare(`ALTER TABLE businesses ADD COLUMN ${name} ${definition}`));
    }
    statements.push(...sql(db, [
      `CREATE TABLE IF NOT EXISTS plans (
        code TEXT PRIMARY KEY, name_uz TEXT NOT NULL, name_ru TEXT NOT NULL,
        price_monthly_uzs INTEGER NOT NULL CHECK (price_monthly_uzs >= 0),
        max_branches INTEGER, max_live_deals INTEGER, max_staff INTEGER,
        top_slots INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1, updated_at TEXT
      )`,
      `INSERT OR IGNORE INTO plans(code, name_uz, name_ru, price_monthly_uzs, max_branches, max_live_deals, max_staff, top_slots, sort_order) VALUES
        ('START', 'Start', 'Старт', 149000, 1, 3, 2, 0, 10),
        ('BIZNES', 'Biznes', 'Бизнес', 299000, 3, 10, 5, 1, 20),
        ('PREMIUM', 'Premium', 'Премиум', 599000, NULL, NULL, NULL, 3, 30)`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT, updated_by TEXT
      )`,
      `INSERT OR IGNORE INTO app_settings(key, value) VALUES
        ('trial_months', '3'), ('trial_plan', 'BIZNES'), ('payment_instructions_uz', ''), ('payment_instructions_ru', '')`,
      `CREATE TABLE IF NOT EXISTS billing_requests (
        id TEXT PRIMARY KEY, business_id TEXT NOT NULL, plan_code TEXT NOT NULL, months INTEGER NOT NULL,
        amount_uzs INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', requested_by TEXT NOT NULL,
        handled_by TEXT, note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, handled_at TEXT,
        FOREIGN KEY(business_id) REFERENCES businesses(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_requests(status, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_billing_business ON billing_requests(business_id, created_at)`,
      // Businesses that were already approved get the launch free period starting now.
      `UPDATE businesses SET trial_ends_at = datetime('now', '+3 months')
        WHERE trial_ends_at IS NULL AND paid_until IS NULL AND verification_status = 'VERIFIED'`,
    ]));
    return statements;
  },
};

/** Original photos uploaded by businesses: deal covers, logos and profile covers. */
const media: Migration = {
  id: '0004_media',
  async build({ db, columns }) {
    const statements: D1PreparedStatement[] = [];
    const addColumns = async (table: string, definitions: Record<string, string>) => {
      const existing = await columns(table);
      for (const [name, definition] of Object.entries(definitions)) {
        if (!existing.has(name)) statements.push(db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`));
      }
    };
    await addColumns('deals', { photo_id: 'TEXT' });
    await addColumns('businesses', { logo_id: 'TEXT', cover_id: 'TEXT' });
    statements.push(...sql(db, [
      // Images are stored base64-encoded: D1 returns TEXT far more cheaply than BLOBs.
      `CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY, business_id TEXT, kind TEXT NOT NULL, mime TEXT NOT NULL, data_base64 TEXT NOT NULL,
        size INTEGER NOT NULL, width INTEGER, height INTEGER, sha256 TEXT NOT NULL, uploaded_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(business_id) REFERENCES businesses(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_media_business ON media(business_id, created_at)`,
    ]));
    return statements;
  },
};

/** Follows, reviews after a redemption, and the Telegram notification outbox. */
const engagement: Migration = {
  id: '0005_engagement',
  async build({ db, columns }) {
    const statements: D1PreparedStatement[] = [];
    const existing = await columns('users');
    for (const [name, definition] of Object.entries({ notify_deals: 'INTEGER NOT NULL DEFAULT 1', notify_reminders: 'INTEGER NOT NULL DEFAULT 1' })) {
      if (!existing.has(name)) statements.push(db.prepare(`ALTER TABLE users ADD COLUMN ${name} ${definition}`));
    }
    statements.push(...sql(db, [
      `CREATE TABLE IF NOT EXISTS follows (
        user_id TEXT NOT NULL, business_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id, business_id),
        FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(business_id) REFERENCES businesses(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_follows_business ON follows(business_id)`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY, redemption_id TEXT NOT NULL UNIQUE, business_id TEXT NOT NULL, deal_id TEXT NOT NULL,
        user_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), comment TEXT,
        status TEXT NOT NULL DEFAULT 'VISIBLE', hidden_reason TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT,
        FOREIGN KEY(redemption_id) REFERENCES redemptions(id), FOREIGN KEY(business_id) REFERENCES businesses(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id, status, created_at)`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE,
        payload_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
        send_after TEXT NOT NULL, claimed_at TEXT, sent_at TEXT, last_error TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_queue ON notifications(status, send_after)`,
    ]));
    return statements;
  },
};

/** Online payments for plans: Payme (Merchant API) and Click (SHOP API). */
const payments: Migration = {
  id: '0006_payments',
  async build({ db }) {
    return sql(db, [
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY, billing_request_id TEXT NOT NULL, provider TEXT NOT NULL,
        provider_transaction_id TEXT NOT NULL, amount_uzs INTEGER NOT NULL,
        state INTEGER NOT NULL, reason INTEGER, provider_time INTEGER,
        create_time INTEGER NOT NULL, perform_time INTEGER, cancel_time INTEGER, meta_json TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(provider, provider_transaction_id),
        FOREIGN KEY(billing_request_id) REFERENCES billing_requests(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_payments_request ON payments(billing_request_id, state)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_statement ON payments(provider, provider_time)`,
    ]);
  },
};

/**
 * Automatic moderation: a system moderator account (it cannot log in: no phone,
 * no Telegram) signs automatic decisions, and items the checks hold back keep
 * the reasons for the human moderator. Auto-approval (and hiding abusive
 * reviews) starts switched on; admins can turn each off.
 */
const autoModeration: Migration = {
  id: '0007_auto_moderation',
  async build({ db, columns }) {
    const statements: D1PreparedStatement[] = [];
    if (!(await columns('businesses')).has('auto_review_note')) statements.push(db.prepare(`ALTER TABLE businesses ADD COLUMN auto_review_note TEXT`));
    if (!(await columns('deals')).has('auto_review_note')) statements.push(db.prepare(`ALTER TABLE deals ADD COLUMN auto_review_note TEXT`));
    statements.push(...sql(db, [
      `INSERT OR IGNORE INTO users(id, role, display_name, locale, status) VALUES ('usr_system', 'MODERATOR', 'BugunBor avtomoderator', 'uz', 'ACTIVE')`,
      `INSERT OR IGNORE INTO app_settings(key, value) VALUES ('auto_approve_businesses', '1'), ('auto_approve_deals', '1'), ('auto_hide_reviews', '1')`,
      `CREATE INDEX IF NOT EXISTS idx_moderation_target ON moderation_actions(target_type, target_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_moderation_actor ON moderation_actions(actor_user_id, created_at)`,
    ]));
    return statements;
  },
};

export const migrations: readonly Migration[] = [baseline, systemV1, billing, media, engagement, payments, autoModeration];
