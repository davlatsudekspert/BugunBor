import { beforeEach, describe, expect, it } from 'vitest';

import { buildDemoCatalog } from '@/db/demo-catalog';
import { applyMigrations } from '@/db/migrate';
import { dateToTashkentInput } from '@/lib/time';
import { listAdminUsers, updateSettings, updateUser } from '@/modules/admin/service';
import { requestPlan } from '@/modules/billing/service';
import type { OnboardingInput } from '@/modules/businesses/schema';
import { createBusiness, listBranches, updateBusinessProfile } from '@/modules/businesses/service';
import { dealInputSchema, type DealInput } from '@/modules/deals/schema';
import { createDeal } from '@/modules/deals/service';
import { createReview } from '@/modules/engagement/reviews';
import { claimDeal, completeRedemption } from '@/modules/redemptions/service';
import { createTestD1 } from '@/test/d1';
import {
  autoModerateBusiness, autoModerateDeal, autoModeratePendingDeals, businessContentFlags, dealContentFlags, ownerFlags, reviewFlags, SYSTEM_MODERATOR_ID, textFlags,
} from './auto';
import { decideBusiness } from './service';

const NOW = new Date('2026-09-25T06:00:00Z');
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code ?? 'UNKNOWN');

const profile: Omit<OnboardingInput, 'address' | 'latitude' | 'longitude'> = {
  name: 'Mening Kafem',
  description: 'Shinam kafe, milliy va yevropa taomlari, bolalar uchun menyu.',
  categoryId: 'cat_food',
  city: 'tashkent',
  phone: '+998901112233',
  telegram: null,
  instagram: null,
  website: null,
};

function dealInput(branchIds: string[], overrides: Partial<Record<keyof DealInput, unknown>> = {}): DealInput {
  return dealInputSchema.parse({
    title: 'Osh va salat kombo',
    description: 'Bir porsiya osh, salat va issiq non — tushlik uchun.',
    terms: 'Faqat restoranda.',
    categoryId: 'cat_food',
    visual: 'plov',
    originalPrice: 60000,
    price: 40000,
    startsAt: dateToTashkentInput(NOW),
    endsAt: dateToTashkentInput(later(240)),
    quantity: 20,
    perCustomerLimit: 1,
    claimTtlMinutes: 60,
    branchIds,
    ...overrides,
  });
}

describe('automatic checks of texts', () => {
  it('finds links, forbidden topics, restricted goods and card numbers in Uzbek, Cyrillic and Russian', () => {
    expect(textFlags('Batafsil: https://mysite.uz/aksiya')).toContain('LINK');
    expect(textFlags('Buyurtma t.me/mening_kanalim orqali')).toContain('LINK');
    expect(textFlags('Hammasi instagram.com/kafe sahifasida')).toContain('LINK');
    expect(textFlags('Arzon narkotik yetkazib beramiz')).toContain('BANNED');
    expect(textFlags('Ov qurollari do‘koni')).toContain('BANNED');
    expect(textFlags('Қурол-яроғ савдоси')).toContain('BANNED');
    expect(textFlags('Казино и ставки на спорт')).toContain('BANNED');
    expect(textFlags('Эскорт услуги 24/7')).toContain('BANNED');
    expect(textFlags('1xBet promokod bilan bonus')).toContain('BANNED');
    expect(textFlags('Пиво 1+1 весь вечер')).toContain('RESTRICTED');
    expect(textFlags('Kalyan 50% chegirma')).toContain('RESTRICTED');
    expect(textFlags('Alkogol ichimliklar')).toContain('RESTRICTED');
    expect(textFlags('Oldindan karta raqamiga o‘tkazing')).toContain('CARD');
    expect(textFlags('To‘lov: 8600 1234 5678 9012')).toContain('CARD');
    expect(textFlags('Предоплата на карту')).toContain('CARD');
  });

  it('leaves ordinary shop, salon, sport and cafe texts alone', () => {
    const clean = [
      'Sport seksiyasi: boks va kurash mashg‘ulotlari',
      'Alkogolsiz kokteyllar va limonadlar',
      'Стрижка, выбрить виски и оформить бороду',
      'Главная героиня фильма — в нашем кинотеатре',
      'Shisha idishlar to‘plami 30% arzon',
      'Tikuvchilik: ko‘ylak tikish va ta’mirlash',
      'Закладки для книг и открытки',
      'Travmatolog qabuli 30% chegirma bilan',
      'Qurilish mollari: sement va g‘isht',
      'Qo‘ng‘iroq qiling: +998 90 123 45 67',
      'Narxi 1 250 000 so‘m o‘rniga 950 000 so‘m',
      'Kechki menyu: shashlik, somsa, ko‘k choy',
      'Intim gigiyena vositalari dorixonada',
    ];
    for (const text of clean) expect(textFlags(text), text).toEqual([]);
  });

  it('passes every business and deal of the demo catalogue', () => {
    const catalog = buildDemoCatalog(NOW);
    for (const business of catalog.businesses) {
      const places = catalog.branches.filter((branch) => branch.businessId === business.id);
      expect(businessContentFlags(business, places), business.name).toEqual([]);
    }
    for (const deal of catalog.deals) expect(dealContentFlags(deal), deal.title).toEqual([]);
    expect(catalog.deals.length).toBeGreaterThan(200);
  });

  it('holds deals whose prices look wrong', () => {
    const deal = { title: 'Osh va salat kombo', description: 'Bir porsiya osh, salat va non.', terms: 'Faqat zalda.', originalPrice: 60000, price: 40000, discountPercent: 33 };
    expect(dealContentFlags(deal)).toEqual([]);
    expect(dealContentFlags({ ...deal, price: 6000, discountPercent: 90 })).toEqual(['DISCOUNT_HIGH']);
    expect(dealContentFlags({ ...deal, originalPrice: 1200, price: 500, discountPercent: 58 })).toEqual(['PRICE_LOW']);
    expect(dealContentFlags({ ...deal, originalPrice: 90_000_000, price: 60_000_000 })).toEqual(['PRICE_HIGH']);
    expect(dealContentFlags({ ...deal, description: 'Osh' })).toEqual(['LOW_QUALITY']);
    expect(dealContentFlags({ ...deal, title: 'Oshhhhhhh!!!' })).toEqual(['LOW_QUALITY']);
  });

  it('hides abusive or spam reviews but not an honest complaint', () => {
    expect(reviewFlags('Ovqat sovuq edi, xizmat sekin. 2 baho.')).toEqual([]);
    expect(reviewFlags('Pivo yaxshi edi')).toEqual([]);
    expect(reviewFlags('Официант — мудак')).toEqual(['PROFANITY']);
    expect(reviewFlags('Скидки тут: www.spam-shop.ru')).toEqual(['LINK']);
    expect(reviewFlags(null)).toEqual([]);
  });

  it('tells the owner only what they can fix', () => {
    expect(ownerFlags('LINK,DUPLICATE_NAME,BANNED')).toEqual(['LINK']);
    expect(ownerFlags('')).toEqual([]);
    expect(ownerFlags(null)).toEqual([]);
  });
});

describe('automatic moderation', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = createTestD1();
    await applyMigrations(db);
    await db.prepare(`INSERT INTO users(id, role, display_name, phone, locale, telegram_user_id) VALUES
      ('owner', 'CUSTOMER', 'Owner', '+998900000001', 'uz', '1001'),
      ('rival', 'CUSTOMER', 'Rival', '+998900000003', 'uz', NULL),
      ('alice', 'CUSTOMER', 'Alice', '+998901234567', 'uz', '1003'),
      ('mod', 'MODERATOR', 'Moderator', '+998900000009', 'uz', '1009'),
      ('admin', 'ADMIN', 'Admin', '+998900000010', 'uz', '1010')`).run();
  });

  async function onboard(overrides: Partial<typeof profile> & { latitude?: number | null; longitude?: number | null; userId?: string } = {}) {
    const { userId = 'owner', latitude = null, longitude = null, ...data } = overrides;
    const business = await createBusiness(db, { userId, locale: 'uz', data: { ...profile, ...data, address: 'Amir Temur 1', latitude, longitude } }, NOW);
    const [branch] = await listBranches(db, business.id, NOW);
    return { businessId: business.id, branchId: branch.id };
  }

  const business = (id: string) =>
    db.prepare(`SELECT verification_status AS status, auto_review_note AS note, trial_ends_at AS trialEndsAt FROM businesses WHERE id = ?1`).bind(id).first<{ status: string; note: string | null; trialEndsAt: string | null }>();
  const deal = (id: string) => db.prepare(`SELECT status, auto_review_note AS note FROM deals WHERE id = ?1`).bind(id).first<{ status: string; note: string | null }>();
  const alerts = (kind: string) =>
    db.prepare(`SELECT user_id AS userId, payload_json AS payload FROM notifications WHERE kind = ?1 ORDER BY user_id`).bind(kind).all<{ userId: string; payload: string }>().then((rows) => rows.results);

  it('approves a clean application at once and starts the free period', async () => {
    const { businessId } = await onboard();
    expect(await autoModerateBusiness(db, businessId, NOW)).toEqual({ status: 'VERIFIED', flags: [] });
    expect(await business(businessId)).toMatchObject({ status: 'VERIFIED', note: '' });
    expect((await business(businessId))?.trialEndsAt).toBeTruthy();
    const action = await db.prepare(`SELECT actor_user_id AS actor, action FROM moderation_actions WHERE target_id = ?1`).bind(businessId).first();
    expect(action).toEqual({ actor: SYSTEM_MODERATOR_ID, action: 'APPROVE' });
    expect((await alerts('BUSINESS_APPROVED')).map((row) => row.userId)).toEqual(['owner']);
    expect(await alerts('REVIEW_NEEDED')).toEqual([]);
    // Nothing left to do on a second run.
    expect(await autoModerateBusiness(db, businessId, NOW)).toBeNull();
  });

  it('holds an application with a link, alerts the moderators once, and approves it when the owner fixes it', async () => {
    const { businessId } = await onboard({ description: 'Menyu va narxlar: www.mening-kafem.uz saytida, keling!' });
    expect(await autoModerateBusiness(db, businessId, NOW)).toEqual({ status: 'PENDING', flags: ['LINK'] });
    expect(await business(businessId)).toMatchObject({ status: 'PENDING', note: 'LINK' });
    const held = await alerts('REVIEW_NEEDED');
    expect(held.map((row) => row.userId)).toEqual(['admin', 'mod']);
    expect(JSON.parse(held[0].payload)).toEqual({ target: 'Business', id: businessId, flags: 'LINK' });

    // Checking the same submission again does not alert twice.
    await autoModerateBusiness(db, businessId, NOW);
    expect(await alerts('REVIEW_NEEDED')).toHaveLength(2);

    await updateBusinessProfile(db, { businessId, userId: 'owner', data: profile, resubmit: false }, later(5));
    expect(await autoModerateBusiness(db, businessId, later(5))).toEqual({ status: 'VERIFIED', flags: [] });
  });

  it('never approves on its own what a moderator rejected before', async () => {
    const { businessId } = await onboard();
    await updateSettings(db, { actorId: 'admin', values: { auto_approve_businesses: '0' } });
    await autoModerateBusiness(db, businessId, NOW);
    await decideBusiness(db, { actorId: 'mod', businessId, decision: 'REJECT', reason: 'Manzil va rasm mos emas' }, later(1));
    await updateSettings(db, { actorId: 'admin', values: { auto_approve_businesses: '1' } });
    await updateBusinessProfile(db, { businessId, userId: 'owner', data: profile, resubmit: true }, later(10));
    expect(await autoModerateBusiness(db, businessId, later(10))).toEqual({ status: 'PENDING', flags: ['RESUBMITTED'] });
  });

  it('holds duplicates in the same city, pins outside Uzbekistan and owners with a rejected business', async () => {
    const first = await onboard({ userId: 'rival' });
    await autoModerateBusiness(db, first.businessId, NOW);
    const copy = await onboard({ name: 'MENING KAFEM!' });
    expect((await autoModerateBusiness(db, copy.businessId, NOW))?.flags).toEqual(['DUPLICATE_NAME']);
    const elsewhere = await onboard({ city: 'samarkand' });
    expect((await autoModerateBusiness(db, elsewhere.businessId, NOW))?.flags).toEqual([]);

    const moscow = await onboard({ name: 'Moskva filiali', latitude: 55.75, longitude: 37.61 });
    expect((await autoModerateBusiness(db, moscow.businessId, NOW))?.flags).toEqual(['LOCATION']);

    await decideBusiness(db, { actorId: 'mod', businessId: copy.businessId, decision: 'REJECT', reason: 'Bu nom boshqa biznesga tegishli' }, later(1));
    const next = await onboard({ name: 'Yangi nuqta', city: 'bukhara' });
    expect((await autoModerateBusiness(db, next.businessId, later(2)))?.flags).toEqual(['OWNER_HISTORY']);
  });

  it('leaves everything to people when switched off, but still checks and alerts', async () => {
    await updateSettings(db, { actorId: 'admin', values: { auto_approve_businesses: '0' } });
    const { businessId } = await onboard();
    expect(await autoModerateBusiness(db, businessId, NOW)).toEqual({ status: 'PENDING', flags: [] });
    expect(await business(businessId)).toMatchObject({ status: 'PENDING', note: '' });
    expect(JSON.parse((await alerts('REVIEW_NEEDED'))[0].payload)).toMatchObject({ flags: '' });
  });

  it('puts a clean deal live at once and checks deals sent during the business review', async () => {
    await updateSettings(db, { actorId: 'admin', values: { auto_approve_businesses: '0' } });
    const { businessId, branchId } = await onboard();
    await autoModerateBusiness(db, businessId, NOW);
    const early = await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId]), submit: true }, NOW);
    expect(await autoModerateDeal(db, early.id, NOW)).toEqual({ status: 'PENDING_REVIEW', flags: [] });
    // Only the business raised an alert; the deal waits for it.
    expect((await alerts('REVIEW_NEEDED')).every((row) => JSON.parse(row.payload).target === 'Business')).toBe(true);

    await decideBusiness(db, { actorId: 'mod', businessId, decision: 'APPROVE', reason: '' }, later(1));
    await autoModeratePendingDeals(db, businessId, later(1));
    expect(await deal(early.id)).toMatchObject({ status: 'ACTIVE', note: '' });

    const next = await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId], { title: 'Somsa va choy seti' }), submit: true }, later(2));
    expect(await autoModerateDeal(db, next.id, later(2))).toEqual({ status: 'ACTIVE', flags: [] });
    expect((await alerts('DEAL_APPROVED')).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps a suspicious deal for the moderators with the reasons', async () => {
    const { businessId, branchId } = await onboard();
    await autoModerateBusiness(db, businessId, NOW);
    const risky = await createDeal(db, {
      businessId,
      userId: 'owner',
      input: dealInput([branchId], { title: 'Pivo va kalyan kechasi', description: 'Oldindan karta raqamiga to‘lov qiling: 8600 1234 5678 9012' }),
      submit: true,
    }, NOW);
    expect(await autoModerateDeal(db, risky.id, NOW)).toEqual({ status: 'PENDING_REVIEW', flags: ['RESTRICTED', 'CARD'] });
    expect(await deal(risky.id)).toMatchObject({ status: 'PENDING_REVIEW', note: 'RESTRICTED,CARD' });
    const dealAlert = (await alerts('REVIEW_NEEDED')).find((row) => JSON.parse(row.payload).target === 'Deal');
    expect(JSON.parse(dealAlert!.payload)).toEqual({ target: 'Deal', id: risky.id, flags: 'RESTRICTED,CARD' });
  });

  it('hides an abusive review at once, unless switched off', async () => {
    const { businessId, branchId } = await onboard();
    await autoModerateBusiness(db, businessId, NOW);
    const live = await createDeal(db, { businessId, userId: 'owner', input: dealInput([branchId]), submit: true }, NOW);
    await autoModerateDeal(db, live.id, NOW);
    const redeemed = async (userId: string) => {
      const claim = await claimDeal(db, { dealId: live.id, branchId, userId, idempotencyKey: `key-${userId}-0001`, secret: 'test-secret', now: later(10) });
      await completeRedemption(db, { businessId, redemptionId: claim.id, staffUserId: 'owner', now: later(20) });
      return claim.id;
    };
    const rude = await createReview(db, { userId: 'alice', redemptionId: await redeemed('alice'), rating: 1, comment: 'Официант — мудак' }, later(40));
    expect(rude.hidden).toBe(true);
    const hidden = await db.prepare(`SELECT status, hidden_reason AS reason FROM reviews WHERE id = ?1`).bind(rude.id).first();
    expect(hidden).toEqual({ status: 'HIDDEN', reason: 'auto:PROFANITY' });

    await updateSettings(db, { actorId: 'admin', values: { auto_hide_reviews: '0' } });
    const kept = await createReview(db, { userId: 'rival', redemptionId: await redeemed('rival'), rating: 2, comment: 'Официант — мудак' }, later(41));
    expect(kept.hidden).toBe(false);
  });

  it('tells the admins about a manual payment request', async () => {
    const { businessId } = await onboard();
    await autoModerateBusiness(db, businessId, NOW);
    await requestPlan(db, { businessId, userId: 'owner', planCode: 'BIZNES', months: 1 }, later(5));
    expect((await alerts('PAYMENT_REQUEST')).map((row) => row.userId)).toEqual(['admin']);
  });

  it('keeps the system moderator out of the user list and out of reach', async () => {
    expect((await listAdminUsers(db, null)).some((user) => user.id === SYSTEM_MODERATOR_ID)).toBe(false);
    expect(await errorCode(updateUser(db, { actorId: 'admin', userId: SYSTEM_MODERATOR_ID, status: 'BLOCKED' }))).toBe('NOT_FOUND');
  });
});
