import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uz } from '@/lib/i18n/uz';
import { toDbTime } from '@/lib/time';
import { SESSION_COOKIE, createSession } from '@/modules/auth/sessions';
import { NOW, marketplace } from '@/test/fixtures';

// The public pages rendered to HTML the way a visitor gets them: what they
// promise about samples (no address, timer or stock) and about real deals.

const state = vi.hoisted(() => ({ db: null as unknown as D1Database, cookies: {} as Record<string, string> }));

vi.mock('@/db/client', () => ({ getDb: async () => state.db }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (state.cookies[name] ? { name, value: state.cookies[name] } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
  useRouter: () => ({ refresh() {}, push() {}, replace() {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/modules/jobs', () => ({ inBackground: () => {} }));
vi.mock('@/lib/env', () => ({
  DEFAULT_HASH_SECRET: 'x',
  isTelegramConfigured: () => true,
  getConfig: () => ({
    appUrl: 'https://bugunbor.uz',
    demoMode: false,
    isDevelopment: false,
    adminPhones: [],
    hashSecret: 'test-secret',
    telegram: { botToken: '1:token', botUsername: 'bugunborbot', webhookSecret: 'hook' },
    app: { fcmServiceAccount: null, reviewLoginCode: null, minBuild: 3 },
    payments: { enabled: false, payme: null, click: null },
  }),
}));

const { default: Home } = await import('./page');
const { default: DealPage } = await import('./deals/[slug]/page');
const { default: BusinessPage } = await import('./businesses/[slug]/page');

const minutes = (value: number) => toDbTime(new Date(NOW.getTime() + value * 60_000));
const html = async (page: Promise<React.ReactNode>) => renderToStaticMarkup(await page);
const deal = (slug: string) => html(DealPage({ params: Promise.resolve({ slug }) }));
const business = (slug: string) => html(BusinessPage({ params: Promise.resolve({ slug }) }));

/** The admin's «Namunalar» switch and a made-up cafe with a street address, a timer and 3 left. */
async function addSample(db: D1Database) {
  await db.batch([
    db.prepare(`INSERT INTO app_settings(key, value) VALUES ('demo_mode', '1')`),
    db.prepare(`INSERT INTO businesses(id, slug, name, description, city, category_id, verification_status, search_text, is_demo)
      VALUES ('demo', 'namuna-kafe', 'Namuna kafe', 'Namuna', 'tashkent', 'cat_food', 'VERIFIED', 'namuna kafe', 1)`),
    db.prepare(`INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, working_hours_json)
      VALUES ('demo_br', 'demo', 'Asosiy filial', 'tashkent', 'Farobiy ko‘chasi, 44', 41340000, 69290000, '{}')`),
    db.prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs,
        discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id,
        claim_ttl_minutes, search_text, is_demo)
      VALUES ('demo_deal', 'demo', 'cat_food', 'namuna-somsa', 'Namuna somsa', 'Tandir somsa', 'Faqat zalda', 20000, 8000, 60, ?1, ?2, 10, 3, 1,
        'ONSITE_CODE', 'ACTIVE', 'owner', 60, 'namuna somsa', 1)`)
      .bind(minutes(-60), minutes(180)),
    db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES ('demo_deal', 'demo_br')`),
  ]);
}

describe('public pages', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    state.db = await marketplace();
    state.cookies = {};
    await addSample(state.db);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a sample deal has no street, directions, check claim, timer or stock count', async () => {
    const page = await deal('namuna-somsa');
    expect(page).toContain('Namuna somsa');
    expect(page).toContain(uz.common.sample);
    for (const made of ['Farobiy ko‘chasi, 44', uz.common.directions, uz.deal.verifiedNote, uz.deal.endsIn, uz.deal.endsAt, '3 ta qoldi']) {
      expect(page).not.toContain(made);
    }
    // Nobody to follow or report, and no «Faol» on a made-up deal.
    for (const pointless of [uz.business.follow, uz.complaint.button, uz.deal.status.LIVE]) expect(page).not.toContain(pointless);
  });

  it('a real deal keeps its address, directions, timer and stock count', async () => {
    const page = await deal('osh');
    for (const shown of ['Amir Temur 1', uz.common.directions, uz.deal.endsIn, '2 ta qoldi', uz.business.follow, uz.complaint.button]) expect(page).toContain(shown);
  });

  it('a sample business lists its branches without a street or directions', async () => {
    const page = await business('namuna-kafe');
    expect(page).toContain('Asosiy filial');
    for (const made of ['Farobiy ko‘chasi, 44', uz.common.directions, uz.business.follow, uz.complaint.button]) expect(page).not.toContain(made);
    const real = await business('kafe');
    for (const shown of ['Amir Temur 1', uz.business.follow, uz.complaint.button]) expect(real).toContain(shown);
  });

  it('«Tasdiqlangan biznes» only after a moderator checked it; until then a new business is «Yangi»', async () => {
    // Put on the site by the automatic check: new, not checked by a person.
    expect(await business('kafe')).toContain(uz.business.newBusiness);
    expect(await business('kafe')).not.toContain(uz.business.verified);
    const newDeal = await deal('osh');
    expect(newDeal).toContain(uz.deal.checkedNote);
    expect(newDeal).not.toContain(uz.deal.verifiedNote);
    expect(newDeal).not.toContain(`aria-label="${uz.business.verified}"`);

    await state.db.prepare(`UPDATE businesses SET badge_verified_at = ?1, badge_verified_by = 'mod' WHERE id = 'biz'`).bind(minutes(0)).run();
    const checked = await business('kafe');
    expect(checked).toContain(uz.business.verified);
    expect(checked).not.toContain(uz.business.newBusiness);
    const checkedDeal = await deal('osh');
    expect(checkedDeal).toContain(uz.deal.verifiedNote);
    expect(checkedDeal).toContain(`aria-label="${uz.business.verified}"`);
    expect(await html(Home())).toContain(`aria-label="${uz.business.verified}"`);

    // Long on the site and never checked: neither mark.
    await state.db.prepare(`UPDATE businesses SET badge_verified_at = NULL, verified_at = ?1 WHERE id = 'biz'`).bind(minutes(-60 * 24 * 60)).run();
    const old = await business('kafe');
    expect(old).not.toContain(uz.business.verified);
    expect(old).not.toContain(uz.business.newBusiness);
  });

  it('a review names its deal as a deal, so a short title is not read as the reviewer’s phone', async () => {
    await state.db.batch([
      state.db.prepare(`UPDATE deals SET title = 'Win 11' WHERE id = 'deal'`),
      state.db.prepare(`INSERT INTO redemptions(id, deal_id, branch_id, user_id, idempotency_key, code_hash, code_hint, status, expires_at, completed_at)
        VALUES ('r1', 'deal', 'br1', 'alice', 'key-r1', 'hash-r1', 'AB', 'COMPLETED', ?1, ?1)`).bind(minutes(-10)),
      state.db.prepare(`INSERT INTO reviews(id, redemption_id, business_id, deal_id, user_id, rating, comment) VALUES ('v1', 'r1', 'biz', 'deal', 'alice', 5, 'Juda zo‘r')`),
    ]);
    const page = await business('kafe');
    expect(page).toContain('Alice K.');
    expect(page).toContain('Aksiya: «Win 11»');
  });

  it('an older text typed in capitals and an address written its own way read like the rest', async () => {
    await state.db.batch([
      state.db.prepare(`UPDATE businesses SET description = 'DASTURXON VA PARDALAR' WHERE id = 'biz'`),
      state.db.prepare(`UPDATE branches SET address = 'Andijon Shahar' WHERE id = 'br1'`),
    ]);
    const page = await business('kafe');
    expect(page).toContain('Dasturxon va pardalar');
    expect(page).not.toContain('DASTURXON VA PARDALAR');
    expect(page).toContain('Andijon shahar');
    expect(page).not.toContain('Andijon Shahar');
  });

  it('views show to the business only once there are enough to mean something', async () => {
    state.cookies[SESSION_COOKIE] = (await createSession(state.db, 'owner', {})).token;
    expect(await deal('osh')).not.toContain(uz.biz.deals.views);
    await state.db.prepare(`UPDATE deals SET view_count = 12 WHERE id = 'deal'`).run();
    expect(await deal('osh')).toContain(`${uz.biz.deals.views}: 12`);
  });

  it('home counts real deals only: a sample neither adds to the numbers nor raises the top discount', async () => {
    const page = await html(Home());
    expect(page).toContain('Bugun Toshkentda 1 ta faol aksiya');
    expect(page).toContain('−40%');
    expect(page).not.toContain('−60%');
    expect(page).toContain(uz.home.trustVerified);
    // The real deal leads; the sample still shows, marked, without a timer or «qoldi».
    expect(page).toContain(uz.home.liveTitle);
    expect(page).toContain('Namuna somsa');
    expect(page).not.toContain('3 ta qoldi');
  });

  it('home with samples only promises nothing: no counts, no «live», sections say they are samples', async () => {
    await state.db.prepare(`UPDATE deals SET status = 'PAUSED' WHERE is_demo = 0`).run();
    const page = await html(Home());
    expect(page).toContain('Toshkentda birinchi aksiyalar tez orada');
    expect(page).not.toContain(uz.home.stats.deals);
    expect(page).not.toContain('−60%');
    expect(page).not.toContain(uz.home.liveBadge);
    expect(page).toContain(uz.home.sampleTitle);
    expect(page).toContain(uz.home.samplesTitle);
    expect(page).toContain(uz.home.categorySamples);
    expect(page).not.toContain('3 ta qoldi');
    // The app block is in the footer only.
    expect(page).not.toContain(uz.appStores.title);
  });
});
