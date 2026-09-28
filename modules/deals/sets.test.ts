import { describe, expect, it } from 'vitest';

import { parseDealSet, setSummary } from '@/lib/deal-set';
import { dateToTashkentInput, toDbTime } from '@/lib/time';
import { NOW, marketplace } from '@/test/fixtures';
import { listAdminDeals } from '@/modules/admin/service';
import { getDealBySlug, listLiveDeals } from '@/modules/catalog/queries';
import { dealContentFlags } from '@/modules/moderation/auto';
import { dealInputSchema } from './schema';
import { createDeal, duplicateDeal, getBusinessDeal, updateDeal } from './service';

const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

const oilaviy = { items: [{ name: 'Osh', qty: 2 }, { name: 'Achchiq-chuchuk salat', qty: 2 }, { name: 'Somsa', qty: 4 }, { name: 'Choy', qty: 1 }], persons: 4 };

const input = (overrides: Record<string, unknown> = {}) =>
  dealInputSchema.parse({
    title: 'Oilaviy set',
    description: 'To‘rt kishilik oilaviy tushlik: osh, salat, somsa va choy.',
    terms: 'Faqat zalda.',
    categoryId: 'cat_food',
    visual: 'plov',
    originalPrice: 240000,
    price: 180000,
    startsAt: dateToTashkentInput(NOW),
    endsAt: dateToTashkentInput(later(240)),
    quantity: 10,
    perCustomerLimit: 1,
    claimTtlMinutes: 60,
    branchIds: ['br1'],
    set: oilaviy,
    ...overrides,
  });

const issues = (overrides: Record<string, unknown>) => {
  const result = dealInputSchema.safeParse({ ...input(), ...overrides });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('what a set holds', () => {
  it('two to twelve named things, each 1–20, for 1–20 people or unsaid', () => {
    expect(issues({})).toEqual([]);
    expect(issues({ set: null })).toEqual([]);
    expect(issues({ set: undefined })).toEqual([]);
    expect(issues({ set: { items: [{ name: 'Osh', qty: 1 }], persons: null } })).toEqual(['set.items: setItems']);
    expect(issues({ set: { items: Array.from({ length: 13 }, (_, index) => ({ name: `Taom ${index}`, qty: 1 })), persons: null } })).toEqual(['set.items: setItems']);
    expect(issues({ set: { items: [{ name: ' ', qty: 1 }, { name: 'Choy', qty: 1 }], persons: 2 } })).toEqual(['set.items.0.name: tooShort']);
    expect(issues({ set: { items: [{ name: 'Osh', qty: 0 }, { name: 'Choy', qty: 21 }], persons: 2 } })).toEqual(['set.items.0.qty: invalid', 'set.items.1.qty: invalid']);
    expect(issues({ set: { ...oilaviy, persons: 21 } })).toEqual(['set.persons: invalid']);
  });

  it('reads back only what makes sense, and says it in one line', () => {
    expect(parseDealSet(JSON.stringify(oilaviy.items), 4)).toEqual(oilaviy);
    expect(parseDealSet(null, 4)).toBeNull();
    expect(parseDealSet('not json', 4)).toBeNull();
    expect(parseDealSet('{"name":"Osh"}', null)).toBeNull();
    expect(parseDealSet('[{"name":"  Osh "},{"name":""},{"qty":3},{"name":"Choy","qty":99}]', 0)).toEqual({
      items: [{ name: 'Osh', qty: 1 }, { name: 'Choy', qty: 20 }],
      persons: null,
    });
    expect(setSummary(oilaviy)).toBe('2× Osh · 2× Achchiq-chuchuk salat · 4× Somsa · Choy');
  });
});

describe('a set deal from the form to the catalogue', () => {
  it('is kept, found by what is in it, filtered, copied and turned back into a regular deal', async () => {
    const db = await marketplace();
    const { id } = await createDeal(db, { businessId: 'biz', userId: 'owner', input: input(), submit: false }, NOW);
    expect((await getBusinessDeal(db, 'biz', id)).set).toEqual(oilaviy);
    // Moderators see what is in it.
    expect((await listAdminDeals(db, 'all', NOW)).find((deal) => deal.id === id)?.set).toEqual(oilaviy);

    // An app that knows nothing about sets saves the form: the set stays.
    const { set: _omit, ...older } = input({ title: 'Oilaviy set 4 kishilik' });
    await updateDeal(db, { businessId: 'biz', userId: 'owner', dealId: id, input: older, submit: false }, NOW);
    expect((await getBusinessDeal(db, 'biz', id)).set).toEqual(oilaviy);

    // On the air: the card and the page carry it; "somsa" finds it; «Setlar» shows only sets.
    await db.prepare(`UPDATE deals SET status = 'ACTIVE', approved_at = ?2 WHERE id = ?1`).bind(id, toDbTime(NOW)).run();
    const all = await listLiveDeals(db, { demo: false, now: later(1) });
    expect(all.map((deal) => [deal.title, deal.set?.persons ?? null])).toEqual(expect.arrayContaining([['Osh', null], ['Oilaviy set 4 kishilik', 4]]));
    expect((await listLiveDeals(db, { sets: true, demo: false, now: later(1) })).map((deal) => deal.id)).toEqual([id]);
    expect((await listLiveDeals(db, { query: 'somsa', demo: false, now: later(1) })).map((deal) => deal.id)).toEqual([id]);
    const slug = all.find((deal) => deal.id === id)!.slug;
    expect((await getDealBySlug(db, slug, { demo: false, now: later(1) }))?.set).toEqual(oilaviy);
    expect((await getDealBySlug(db, 'osh', { demo: false, now: later(1) }))?.set).toBeNull();

    // A copy is a set too.
    const copy = await duplicateDeal(db, { businessId: 'biz', userId: 'owner', dealId: id }, later(2));
    expect((await getBusinessDeal(db, 'biz', copy.id)).set).toEqual(oilaviy);

    // Unticked in the form: a regular deal again, no longer found by its items.
    await updateDeal(db, { businessId: 'biz', userId: 'owner', dealId: copy.id, input: input({ set: null }), submit: false }, later(3));
    expect((await getBusinessDeal(db, 'biz', copy.id)).set).toBeNull();
    const row = await db.prepare(`SELECT set_items_json AS items, set_persons AS persons, search_text AS text FROM deals WHERE id = ?1`).bind(copy.id).first<{ items: string | null; persons: number | null; text: string }>();
    expect(row).toMatchObject({ items: null, persons: null });
    expect(row?.text).not.toContain('achchiq');
  });

  it('what a set holds is checked like the rest of its text', () => {
    const deal = { title: 'Oilaviy set', description: 'To‘rt kishilik oilaviy tushlik: osh va salat.', terms: 'Faqat zalda.', originalPrice: 240000, price: 180000, discountPercent: 25 };
    expect(dealContentFlags({ ...deal, setItemsJson: JSON.stringify(oilaviy.items) })).toEqual([]);
    expect(dealContentFlags({ ...deal, setItemsJson: JSON.stringify([{ name: 'Osh', qty: 1 }, { name: 'Kanal: t.me/kafe', qty: 1 }]) })).toEqual(['LINK']);
  });
});
