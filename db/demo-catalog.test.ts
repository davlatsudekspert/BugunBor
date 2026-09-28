import { describe, expect, it } from 'vitest';

import { CITIES } from '@/lib/cities';
import { parseDealSet } from '@/lib/deal-set';
import { toDbTime } from '@/lib/time';
import { isDealVisual } from '@/lib/visuals';
import { listLiveDeals } from '@/modules/catalog/queries';
import { dealSetSchema } from '@/modules/deals/schema';
import { createTestD1 } from '@/test/d1';
import { buildDemoCatalog, DEMO_CATEGORIES, discountedPrice, EXTRA_SHOPS, regionalPrice } from './demo-catalog';
import { applyMigrations } from './migrate';
import { DEMO_SEED_VERSION, refreshDemoData, seedDemoData } from './seed';

const NOW = new Date('2026-09-25T06:00:00Z'); // 11:00 in Tashkent
const CURATED_DEALS = 9;
const GENERATED_BUSINESSES = CITIES.length * DEMO_CATEGORIES.length + EXTRA_SHOPS.length;
const GENERATED_DEALS = GENERATED_BUSINESSES * 2;
const unique = (values: string[]) => new Set(values).size === values.length;

describe('demo catalog', () => {
  const catalog = buildDemoCatalog(NOW);

  it('has a business in every city for every category, with two deals each', () => {
    expect(catalog.businesses).toHaveLength(GENERATED_BUSINESSES);
    expect(catalog.deals).toHaveLength(GENERATED_DEALS);
    for (const city of CITIES) {
      const categories = catalog.businesses.filter((business) => business.city === city.slug).map((business) => business.categoryId);
      expect(new Set(categories).size).toBe(DEMO_CATEGORIES.length);
    }
  });

  it('uses unique ids, slugs and business names per city', () => {
    expect(unique(catalog.businesses.map((business) => business.slug))).toBe(true);
    expect(unique(catalog.businesses.map((business) => `${business.city}:${business.name}`))).toBe(true);
    expect(unique(catalog.deals.map((deal) => deal.id))).toBe(true);
    expect(unique(catalog.deals.map((deal) => deal.slug))).toBe(true);
    expect(unique(catalog.branches.map((branch) => branch.id))).toBe(true);
  });

  it('prices look like real receipts', () => {
    for (const deal of catalog.deals) {
      expect(deal.price, deal.id).toBeLessThan(deal.originalPrice);
      expect(deal.price % 1000, deal.id).toBe(0);
      expect(deal.originalPrice % 1000, deal.id).toBe(0);
      expect(deal.price, deal.id).toBeGreaterThanOrEqual(10_000);
      expect(deal.discountPercent, deal.id).toBeGreaterThanOrEqual(10);
      expect(deal.discountPercent, deal.id).toBeLessThanOrEqual(60);
      expect(isDealVisual(deal.visual), deal.id).toBe(true);
      expect(deal.endsAt > deal.startsAt, deal.id).toBe(true);
      if (deal.totalQuantity !== null) expect(deal.remainingQuantity).toBeLessThanOrEqual(deal.totalQuantity);
    }
  });

  it('scales prices down for the regions and rounds like a menu', () => {
    expect(regionalPrice(58_000, 1)).toBe(58_000);
    expect(regionalPrice(58_000, 0.8)).toBe(46_000);
    expect(regionalPrice(550_000, 0.85)).toBe(470_000);
    expect(discountedPrice(58_000, 25)).toBe(44_000);
    expect(discountedPrice(230_000, 35)).toBe(150_000);
    const tashkent = catalog.deals.find((deal) => deal.id === 'gdeal_tashkent_sport_1');
    const nukusSame = catalog.deals.find((deal) => deal.slug === tashkent?.slug.replace('-tashkent', '-nukus'));
    if (tashkent && nukusSame) expect(nukusSame.originalPrice).toBeLessThan(tashkent.originalPrice);
  });

  it('has home textile and phone shops in several cities, with deals on from the start', () => {
    const cities = (visual: string) => new Set(catalog.deals.filter((deal) => deal.visual === visual).map((deal) => deal.businessId.split('_')[1]));
    expect(cities('bedding').size).toBeGreaterThanOrEqual(4);
    expect(cities('towels').size).toBeGreaterThanOrEqual(4);
    expect(cities('phone').size).toBeGreaterThanOrEqual(3);
    const extras = catalog.deals.filter((deal) => EXTRA_SHOPS.some((shop) => deal.businessId === `gbiz_${shop.city}_${shop.key}`));
    expect(extras).toHaveLength(EXTRA_SHOPS.length * 2);
    for (const deal of extras) expect(deal.startsAt <= toDbTime(NOW), deal.id).toBe(true);
  });

  it('writes sets that pass the same rules as the deal form', () => {
    const sets = catalog.deals.filter((deal) => deal.setItemsJson);
    expect(sets.length).toBeGreaterThan(20);
    for (const deal of sets) {
      const set = parseDealSet(deal.setItemsJson, deal.setPersons);
      expect(dealSetSchema.safeParse(set).success, deal.id).toBe(true);
    }
    expect(catalog.deals.find((deal) => deal.id === 'gdeal_tashkent_tekstil_1')?.setPersons).toBe(2);
    expect(catalog.deals.filter((deal) => !deal.setItemsJson).every((deal) => deal.setPersons === null)).toBe(true);
  });

  it('gives every city its own mix of deals', () => {
    const signatures = CITIES.map((city) =>
      catalog.deals.filter((deal) => deal.businessId.startsWith(`gbiz_${city.slug}_`)).map((deal) => deal.title).sort().join('|'));
    expect(new Set(signatures).size).toBe(CITIES.length);
  });
});

describe('demo seed', () => {
  async function seeded() {
    const db = createTestD1();
    await applyMigrations(db);
    await seedDemoData(db, NOW);
    return db;
  }

  it('loads everything once, then only refreshes until the version changes', async () => {
    const db = await seeded();
    const count = await db.prepare(`SELECT COUNT(*) AS n FROM deals WHERE is_demo = 1`).first<{ n: number }>();
    expect(count?.n).toBe(CURATED_DEALS + GENERATED_DEALS);
    const version = await db.prepare(`SELECT value FROM app_settings WHERE key = 'demo_seed_version'`).first<{ value: string }>();
    expect(version?.value).toBe(DEMO_SEED_VERSION);
    const phones = await db.prepare(`SELECT COUNT(*) AS n FROM businesses WHERE is_demo = 1 AND (phone IS NOT NULL OR telegram IS NOT NULL)`).first<{ n: number }>();
    expect(phones?.n).toBe(0);
    const branchPhones = await db.prepare(`SELECT COUNT(*) AS n FROM branches br JOIN businesses b ON b.id = br.business_id WHERE b.is_demo = 1 AND br.phone IS NOT NULL`).first<{ n: number }>();
    expect(branchPhones?.n).toBe(0);

    await db.prepare(`UPDATE deals SET title = 'Changed' WHERE id = 'gdeal_tashkent_food_1'`).run();
    await seedDemoData(db, NOW);
    expect(await db.prepare(`SELECT title FROM deals WHERE id = 'gdeal_tashkent_food_1'`).first('title')).toBe('Changed');

    await seedDemoData(db, NOW, { force: true });
    expect(await db.prepare(`SELECT title FROM deals WHERE id = 'gdeal_tashkent_food_1'`).first('title')).not.toBe('Changed');
  });

  it('shows the textile and phone sets under «Setlar» and in search', async () => {
    const db = await seeded();
    const sets = await listLiveDeals(db, { city: 'tashkent', sets: true, demo: true, now: NOW });
    expect(sets.map((deal) => deal.title)).toEqual(expect.arrayContaining(['Satin choyshab to‘plami (2 kishilik)', 'Mahra sochiqlar to‘plami (6 dona)']));
    expect(sets.find((deal) => deal.title.startsWith('Satin choyshab'))?.set).toEqual({
      items: [{ name: 'Ko‘rpa jildi', qty: 1 }, { name: 'Choyshab', qty: 1 }, { name: 'Yostiq jildi', qty: 2 }],
      persons: 2,
    });
    const found = await listLiveDeals(db, { city: 'tashkent', query: 'yostiq', demo: true, now: NOW });
    expect(found.map((deal) => deal.title)).toContain('Satin choyshab to‘plami (2 kishilik)');
    const phones = await listLiveDeals(db, { city: 'tashkent', query: 'smartfon', demo: true, now: NOW });
    expect(phones.length).toBeGreaterThanOrEqual(2);
  });

  it('shows plenty of live deals in every city, and none when demo mode is off', async () => {
    const db = await seeded();
    for (const city of CITIES) {
      const deals = await listLiveDeals(db, { city: city.slug, demo: true, now: NOW });
      expect(deals.length, city.slug).toBeGreaterThanOrEqual(10);
    }
    expect(await listLiveDeals(db, { city: 'tashkent', demo: false, now: NOW })).toHaveLength(0);
  });

  it('restarts ended demo deals with fresh stock', async () => {
    const db = await seeded();
    const later = new Date(NOW.getTime() + 10 * 24 * 60 * 60_000);
    await refreshDemoData(db, later);
    const stale = await db.prepare(`SELECT COUNT(*) AS n FROM deals WHERE is_demo = 1 AND status = 'ACTIVE' AND ends_at <= ?1`).bind(toDbTime(later)).first<{ n: number }>();
    expect(stale?.n).toBe(0);
    const empty = await db.prepare(`SELECT COUNT(*) AS n FROM deals WHERE is_demo = 1 AND remaining_quantity < 1`).first<{ n: number }>();
    expect(empty?.n).toBe(0);
    const live = await listLiveDeals(db, { city: 'samarkand', demo: true, now: later });
    expect(live.length).toBeGreaterThanOrEqual(10);
  });
});
