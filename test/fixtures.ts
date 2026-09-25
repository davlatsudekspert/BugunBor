import { applyMigrations } from '@/db/migrate';
import { toDbTime } from '@/lib/time';
import { createTestD1 } from './d1';

export const NOW = new Date('2026-09-25T10:00:00Z');
export const SECRET = 'test-secret';

const minutes = (value: number) => toDbTime(new Date(NOW.getTime() + value * 60_000));

/** A migrated database with one verified business, two branches and a live deal. */
export async function marketplace() {
  const db = createTestD1();
  await applyMigrations(db);
  await db.batch([
    db.prepare(`INSERT INTO users(id, role, display_name, phone, locale) VALUES
      ('owner', 'CUSTOMER', 'Owner', '+998900000001', 'uz'),
      ('cashier', 'CUSTOMER', 'Cashier', '+998900000002', 'uz'),
      ('alice', 'CUSTOMER', 'Alice Karimova', '+998901234567', 'uz'),
      ('bob', 'CUSTOMER', 'Bob', '+998907654321', 'uz'),
      ('mod', 'MODERATOR', 'Moderator', '+998900000009', 'uz'),
      ('stranger', 'CUSTOMER', 'Stranger', '+998900000010', 'uz')`),
    db.prepare(`INSERT INTO businesses(id, slug, name, description, city, category_id, phone, verification_status, search_text, trial_ends_at) VALUES
      ('biz', 'kafe', 'Kafe', 'Yaxshi kafe', 'tashkent', 'cat_food', '+998712000000', 'VERIFIED', 'kafe yaxshi kafe', ?1),
      ('other', 'boshqa', 'Boshqa', 'Boshqa biznes', 'tashkent', 'cat_food', '+998712000001', 'VERIFIED', 'boshqa', ?1)`)
      .bind(minutes(60 * 24 * 30)),
    db.prepare(`INSERT INTO business_members(business_id, user_id, role) VALUES ('biz', 'owner', 'OWNER'), ('biz', 'cashier', 'CASHIER')`),
    db.prepare(`INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, working_hours_json) VALUES
      ('br1', 'biz', 'Markaz', 'tashkent', 'Amir Temur 1', 41311100, 69279700, '{"open":"09:00","close":"22:00"}'),
      ('br2', 'biz', 'Chilonzor', 'tashkent', 'Bunyodkor 2', 41280000, 69210000, '{"open":"09:00","close":"22:00"}'),
      ('brx', 'other', 'Boshqa', 'tashkent', 'Boshqa 3', 41300000, 69200000, '{}')`),
    db.prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs,
        discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id,
        claim_ttl_minutes, search_text)
      VALUES ('deal', 'biz', 'cat_food', 'osh', 'Osh', 'Mazali osh', 'Faqat zalda', 50000, 30000, 40, ?1, ?2, 2, 2, 1, 'ONSITE_CODE', 'ACTIVE', 'owner', 60, 'osh mazali osh')`)
      .bind(minutes(-60), minutes(120)),
    db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES ('deal', 'br1'), ('deal', 'br2')`),
  ]);
  return db;
}
