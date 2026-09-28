import { describe, expect, it } from 'vitest';

import { getDealBySlug, getPublicBusiness, listLiveDeals } from '@/modules/catalog/queries';
import { createTestD1 } from '@/test/d1';
import { SAMPLE_RU, sampleInRussian } from './demo-ru';
import { applyMigrations } from './migrate';
import { seedDemoData } from './seed';

// The Russian site shows samples in Russian: every text the sample seed writes
// has its Russian line, and a business's own words are never touched.

const NOW = new Date('2026-09-25T06:00:00Z');

async function seeded() {
  const db = createTestD1();
  await applyMigrations(db);
  await seedDemoData(db, NOW);
  return db;
}

describe('samples in Russian', () => {
  it('every text a sample shows has its Russian line, written in Russian', async () => {
    const db = await seeded();
    const texts = new Set<string>();
    const deals = await db.prepare(`SELECT title, description, terms, set_items_json AS items FROM deals WHERE is_demo = 1`).all<{ title: string; description: string; terms: string; items: string | null }>();
    for (const deal of deals.results) {
      for (const text of [deal.title, deal.description, deal.terms]) texts.add(text);
      for (const item of JSON.parse(deal.items ?? '[]') as Array<{ name: string }>) texts.add(item.name);
    }
    const businesses = await db.prepare(`SELECT description FROM businesses WHERE is_demo = 1`).all<{ description: string }>();
    for (const business of businesses.results) texts.add(business.description);
    const branches = await db.prepare(`SELECT br.name FROM branches br JOIN businesses b ON b.id = br.business_id WHERE b.is_demo = 1`).all<{ name: string }>();
    for (const branch of branches.results) texts.add(branch.name);

    expect(texts.size).toBeGreaterThan(300);
    const missing = [...texts].filter((text) => !SAMPLE_RU.has(text));
    expect(missing).toEqual([]);
    for (const [uzbek, russian] of SAMPLE_RU) {
      expect(russian, uzbek).toMatch(/\p{Script=Cyrillic}/u);
      // o‘ and g‘ are Uzbek letters: a line that keeps one was left untranslated.
      expect(russian, uzbek).not.toMatch(/[‘ʻ]/);
    }
  });

  it('the Russian site lists, opens and searches samples in Russian', async () => {
    const db = await seeded();
    const [uz, ru] = await Promise.all([
      listLiveDeals(db, { city: 'tashkent', sets: true, demo: true, now: NOW }),
      listLiveDeals(db, { city: 'tashkent', sets: true, demo: true, now: NOW, locale: 'ru' }),
    ]);
    const bedding = ru.find((deal) => deal.slug === 'satin-choyshab-tashkent');
    expect(uz.find((deal) => deal.slug === 'satin-choyshab-tashkent')?.title).toBe('Satin choyshab to‘plami (2 kishilik)');
    expect(bedding?.title).toBe('Комплект постельного белья из сатина (двуспальный)');
    expect(bedding?.set?.items.map((item) => item.name)).toEqual(['Пододеяльник', 'Простыня', 'Наволочка']);
    expect(bedding?.branch.name).toBe('Филиал в Чиланзаре');

    const deal = await getDealBySlug(db, 'satin-choyshab-tashkent', { demo: true, now: NOW, locale: 'ru' });
    expect(deal?.description).toBe(sampleInRussian('Yumshoq satin, pastel ranglarda: ko‘rpa jildi, choyshab va ikkita yostiq jildi.'));
    expect(deal?.description).toMatch(/^Мягкий сатин/);
    expect(deal?.terms).toMatch(/\p{Script=Cyrillic}/u);
    expect(deal?.business.description).toMatch(/\p{Script=Cyrillic}/u);

    const business = await getPublicBusiness(db, 'parizod-uy-tekstili-tashkent', { demo: true, now: NOW, locale: 'ru' });
    expect(business?.description).toBe('Постельное бельё, полотенца и домашний текстиль — есть и наборы в приданое.');
    expect(business?.deals.every((item) => /\p{Script=Cyrillic}/u.test(item.title))).toBe(true);

    // Typed in Russian, a search finds the Uzbek-written sample.
    const towels = await listLiveDeals(db, { city: 'tashkent', query: 'полотенец', demo: true, now: NOW, locale: 'ru' });
    expect(towels.map((item) => item.slug)).toContain('mahra-sochiqlar-tashkent');
  });

  it('a business’s own words stay as written, even when they match a sample', async () => {
    const db = await seeded();
    await db.batch([
      db.prepare(`INSERT INTO businesses(id, slug, name, description, city, category_id, verification_status, search_text, trial_ends_at)
        VALUES ('real', 'real-cafe', 'Real', 'Qovurilgan kofe, kruassanlar va shinam muhit.', 'tashkent', 'cat_coffee', 'VERIFIED', 'real', '2027-01-01 00:00:00')`),
      db.prepare(`INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, working_hours_json)
        VALUES ('real_br', 'real', 'Markaz', 'tashkent', 'Amir Temur 1', 41311100, 69279700, '{}')`),
      db.prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs,
          discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id,
          claim_ttl_minutes, search_text)
        VALUES ('real_deal', 'real', 'cat_coffee', 'real-kapuchino', 'Kapuchino + kruassan', 'Katta kapuchino va sariyog‘li kruassan.', 'Faqat kafeda. Stol band qilish shart emas.',
          60000, 40000, 33, '2026-09-25 05:00:00', '2026-09-25 12:00:00', 10, 10, 1, 'ONSITE_CODE', 'ACTIVE', 'usr_owner_demo', 60, 'kapuchino')`),
      db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES ('real_deal', 'real_br')`),
    ]);
    const cards = await listLiveDeals(db, { city: 'tashkent', query: 'kapuchino', demo: false, now: NOW, locale: 'ru' });
    expect(cards.map((item) => [item.title, item.branch.name])).toEqual([['Kapuchino + kruassan', 'Markaz']]);
    const deal = await getDealBySlug(db, 'real-kapuchino', { demo: false, now: NOW, locale: 'ru' });
    expect([deal?.description, deal?.terms, deal?.business.description]).toEqual([
      'Katta kapuchino va sariyog‘li kruassan.', 'Faqat kafeda. Stol band qilish shart emas.', 'Qovurilgan kofe, kruassanlar va shinam muhit.',
    ]);
  });
});
