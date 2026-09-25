import { describe, expect, it } from 'vitest';

import { createTestD1 } from '@/test/d1';
import { applyMigrations } from './migrate';
import { migrations } from './migrations';
import { seedDemoData } from './seed';

// The phase 1 checkpoint created these rows on every cold start.
const legacySeed = [
  `INSERT INTO users(id, role, phone, email, display_name) VALUES
    ('usr_customer_demo', 'CUSTOMER', '+998901234567', 'customer@bugunbor.dev', 'Aziza Karimova'),
    ('usr_owner_demo', 'BUSINESS_OWNER', '+998909876543', 'owner@bugunbor.dev', 'Sardor Raximov'),
    ('usr_moderator_demo', 'MODERATOR', '+998901110022', 'moderator@bugunbor.dev', 'Madina Qodirova'),
    ('usr_admin_demo', 'ADMIN', '+998901110033', 'admin@bugunbor.dev', 'Kamol Sodiqov')`,
  `INSERT INTO categories(id, slug, name_uz, icon, sort_order) VALUES
    ('cat_food', 'taomlar', 'Taomlar', 'utensils', 10), ('cat_coffee', 'kofe', 'Kofe', 'coffee', 20),
    ('cat_shop', 'xaridlar', 'Xaridlar', 'shopping-bag', 30), ('cat_delivery', 'yetkazish', 'Yetkazish', 'bike', 40)`,
  `INSERT INTO businesses(id, slug, name, description, city, category_id, phone, verification_status) VALUES
    ('biz_besh_qozon', 'besh-qozon', 'Besh Qozon', 'Toshkent palovi.', 'Toshkent', 'cat_food', '+998712005005', 'VERIFIED'),
    ('biz_real', 'mening-kafem-abc123', 'Mening kafem', 'Haqiqiy biznes tavsifi uchun matn.', 'Samarqand', 'cat_coffee', '+998901112233', 'PENDING')`,
  `INSERT INTO business_members(business_id, user_id, role) VALUES ('biz_besh_qozon', 'usr_owner_demo', 'OWNER')`,
  `INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, working_hours_json) VALUES
    ('br_besh_yunusobod', 'biz_besh_qozon', 'Yunusobod filiali', 'Toshkent', 'Amir Temur shoh ko‘chasi, 108', 41349300, 69287200, '{"mon-sun":"10:00-23:00"}')`,
  `INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs, discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id) VALUES
    ('deal_osh', 'biz_besh_qozon', 'cat_food', 'toy-oshi-chegirma', 'To‘y oshi', 'Bir porsiya to‘y oshi.', 'Faqat Yunusobod filialida.', 65000, 39000, 40, datetime('now','-1 hour'), datetime('now','+2 hour'), 40, 0, 1, 'ONSITE_CODE', 'SOLD_OUT', 'usr_owner_demo')`,
  `INSERT INTO deal_branches(deal_id, branch_id) VALUES ('deal_osh', 'br_besh_yunusobod')`,
  `INSERT INTO redemptions(id, deal_id, branch_id, user_id, idempotency_key, code_hash, code_hint, expires_at) VALUES
    ('red_1', 'deal_osh', 'br_besh_yunusobod', 'usr_customer_demo', 'key-000000000001', 'hash-1', 'ABC123', '2026-08-31T10:15:00.000Z')`,
];

async function legacyDatabase() {
  const db = createTestD1();
  await applyMigrations(db, migrations.slice(0, 1));
  for (const statement of legacySeed) await db.prepare(statement).run();
  return db;
}

describe('migrations', () => {
  it('creates the full schema on an empty database and is idempotent', async () => {
    const db = createTestD1();
    await applyMigrations(db);
    await applyMigrations(db);
    const applied = await db.prepare('SELECT id FROM _migrations ORDER BY id').all<{ id: string }>();
    expect(applied.results.map((row) => row.id)).toEqual(migrations.map((migration) => migration.id));
    const categories = await db.prepare('SELECT slug, name_ru FROM categories ORDER BY sort_order').all<{ slug: string; name_ru: string }>();
    expect(categories.results.length).toBeGreaterThanOrEqual(8);
    expect(categories.results.every((category) => category.name_ru)).toBe(true);
  });

  it('upgrades a phase 1 database without losing real data', async () => {
    const db = await legacyDatabase();
    await applyMigrations(db);

    const owner = await db.prepare(`SELECT role, phone FROM users WHERE id = 'usr_owner_demo'`).first<{ role: string; phone: string | null }>();
    expect(owner).toEqual({ role: 'CUSTOMER', phone: null });
    const admin = await db.prepare(`SELECT role, phone FROM users WHERE id = 'usr_admin_demo'`).first<{ role: string; phone: string | null }>();
    expect(admin?.phone).toBeNull();

    const legacy = await db.prepare(`SELECT name, slug, city, is_demo FROM businesses WHERE id = 'biz_besh_qozon'`).first();
    expect(legacy).toEqual({ name: 'Oltin Qozon', slug: 'oltin-qozon', city: 'tashkent', is_demo: 1 });
    const real = await db.prepare(`SELECT name, city, is_demo, search_text FROM businesses WHERE id = 'biz_real'`).first();
    expect(real).toEqual({ name: 'Mening kafem', city: 'samarkand', is_demo: 0, search_text: 'mening kafem haqiqiy biznes tavsifi uchun matn' });

    const deal = await db.prepare(`SELECT status, is_demo, claim_ttl_minutes FROM deals WHERE id = 'deal_osh'`).first();
    expect(deal).toEqual({ status: 'ACTIVE', is_demo: 1, claim_ttl_minutes: 120 });

    const redemption = await db.prepare(`SELECT business_id, expires_at FROM redemptions WHERE id = 'red_1'`).first();
    expect(redemption).toEqual({ business_id: 'biz_besh_qozon', expires_at: '2026-08-31 10:15:00' });
  });

  it('seeds demo data repeatedly without duplicating rows', async () => {
    const db = await legacyDatabase();
    await applyMigrations(db);
    await seedDemoData(db);
    await seedDemoData(db);
    const deals = await db.prepare(`SELECT COUNT(*) AS count FROM deals WHERE is_demo = 1`).first<{ count: number }>();
    expect(deals?.count).toBe(9);
    const osh = await db.prepare(`SELECT status, remaining_quantity FROM deals WHERE id = 'deal_osh'`).first();
    expect(osh).toEqual({ status: 'ACTIVE', remaining_quantity: 0 });
  });
});
