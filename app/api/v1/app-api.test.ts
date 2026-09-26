import { readFileSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assetLinks } from '@/lib/app-links';
import { createSession } from '@/modules/auth/sessions';
import { handleTelegramUpdate } from '@/modules/telegram/bot';
import { NOW, marketplace } from '@/test/fixtures';

// The API the mobile app relies on, called through the real route handlers.
// Each response's shape (keys and value types) is pinned in contracts/*.json;
// the app's own tests parse the same files, so a renamed key fails on both
// sides instead of silently showing an empty screen.
// UPDATE_CONTRACTS=1 npx vitest run app/api/v1/app-api.test.ts rewrites them.

const state = vi.hoisted(() => ({ db: null as unknown as D1Database, reviewCode: null as string | null }));

vi.mock('@/db/client', () => ({ getDb: async () => state.db }));
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
    app: { fcmServiceAccount: null, reviewLoginCode: state.reviewCode, minBuild: 3 },
    payments: { enabled: false, payme: null, click: null },
  }),
}));

const { GET: config } = await import('./config/route');
const { GET: feed } = await import('./feed/route');
const { GET: deal } = await import('./deals/[id]/route');
const { GET: business } = await import('./businesses/[slug]/route');
const { GET: me, PATCH: patchMe, DELETE: deleteMe } = await import('./me/route');
const { GET: myCodes } = await import('./me/redemptions/route');
const { GET: myFavorites } = await import('./me/favorites/route');
const { GET: myFollows } = await import('./me/follows/route');
const { PUT: putInterests } = await import('./me/interests/route');
const { PUT: putDevice, DELETE: deleteDevice } = await import('./me/devices/route');
const { PUT: block, DELETE: unblock } = await import('./me/blocks/[businessId]/route');
const { POST: report } = await import('./reports/route');
const { POST: registerBusiness } = await import('./businesses/route');
const { GET: workspace, POST: businessAction } = await import('./business/[businessId]/route');
const { GET: businessDeals } = await import('./business/[businessId]/deals/route');
const { GET: businessDeal } = await import('./business/[businessId]/deals/[dealId]/route');
const { POST: uploadMedia } = await import('./business/[businessId]/media/route');
const { POST: reviewLogin } = await import('./auth/review/route');
const { POST: startLogin } = await import('./auth/telegram/start/route');
const { GET: loginStatus } = await import('./auth/telegram/status/route');

const APP_HEADERS = { 'x-app': 'bugunbor', 'x-app-build': '7' };
const req = (path: string, init: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
  new Request(`https://bugunbor.uz${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...APP_HEADERS,
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
const params = <T>(value: T) => ({ params: Promise.resolve(value) });
const read = async (response: Response) => ({ status: response.status, body: (await response.json()) as { data: Record<string, unknown> & unknown[]; error?: { code: string } } });

/** Keys and value types, recursively (arrays by their first element). */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? [shape(value[0])] : [];
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape((value as Record<string, unknown>)[key])]));
  return value === null ? 'null' : typeof value;
}

const contractsDir = new URL('../../../contracts/', import.meta.url);
function pinContract(name: string, sample: unknown) {
  const file = new URL(`${name}.json`, contractsDir);
  if (process.env.UPDATE_CONTRACTS) {
    writeFileSync(file, `${JSON.stringify(sample, null, 2)}\n`);
    return;
  }
  const pinned = JSON.parse(readFileSync(file, 'utf8')) as unknown;
  expect(shape(sample), `contracts/${name}.json`).toEqual(shape(pinned));
}

let alice = '';
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  state.db = await marketplace();
  state.reviewCode = null;
  alice = (await createSession(state.db, 'alice', { client: 'app', appBuild: '7' })).token;
});
afterEach(() => vi.useRealTimers());

describe('app API', () => {
  it('serves the startup config', async () => {
    const { status, body } = await read(await config(req('/api/v1/config')));
    expect(status).toBe(200);
    expect(body.data).toMatchObject({ demo: false, tariffsEnabled: false, minAppBuild: 3, telegramBot: 'bugunborbot' });
    expect((body.data.categories as unknown[]).length).toBeGreaterThan(3);
    pinContract('config', body.data);
  });

  it('signs the app in through Telegram and returns a bearer token, never a cookie', async () => {
    const refused = await read(await startLogin(req('/api/v1/auth/telegram/start', { method: 'POST', body: { client: 'app' } })));
    expect(refused).toMatchObject({ status: 422, body: { error: { code: 'CONSENT_REQUIRED' } } });

    const started = await startLogin(req('/api/v1/auth/telegram/start', { method: 'POST', body: { client: 'app', consent: true } }));
    expect(started.headers.get('set-cookie')).toBeNull();
    const { body } = await read(started);
    pinContract('login-start', body.data);
    const secret = body.data.loginSecret as string;
    const token = new URL(body.data.deepLink as string).searchParams.get('start');

    const sent: string[] = [];
    const sender = { async sendMessage(_chat: number | string, text: string) { sent.push(text); }, async answerCallback() {}, async clearInlineKeyboard() {} };
    const from = { id: 4242, first_name: 'Dilnoza', language_code: 'uz' };
    await handleTelegramUpdate(state.db, { update_id: 1, message: { message_id: 1, from, chat: { id: 4242, type: 'private' }, text: `/start ${token}` } }, { sender, adminPhones: [], siteUrl: 'x', now: NOW });
    // The code is the one the app shows, and the app is named as the device.
    expect(sent.at(-1)).toContain('Ilovadagi moslik kodi: <b>');
    expect(sent.at(-1)).toContain('Qurilma: BugunBor ilovasi');
    await handleTelegramUpdate(state.db, { update_id: 2, message: { message_id: 2, from, chat: { id: 4242, type: 'private' }, contact: { phone_number: '+998905550042', first_name: 'Dilnoza', user_id: 4242 } } }, { sender, adminPhones: [], siteUrl: 'x', now: NOW });
    expect(sent.at(-1)).toContain('ilovasiga qayting');

    const approved = await loginStatus(req('/api/v1/auth/telegram/status', { headers: { 'x-login-secret': secret } }));
    expect(approved.headers.get('set-cookie')).toBeNull();
    const status = await read(approved);
    pinContract('login-status', status.body.data);
    const session = await state.db.prepare(`SELECT client, app_build AS build FROM sessions ORDER BY created_at DESC, rowid DESC LIMIT 1`).first();
    expect(session).toEqual({ client: 'app', build: '7' });

    const profile = await read(await me(req('/api/v1/me', { token: status.body.data.token as string })));
    expect(profile.body.data.user).toMatchObject({ displayName: 'Dilnoza', phone: '+998905550042' });
  });

  it('keeps cookie requests protected from other sites but lets the app send its token', async () => {
    const fromApp = await patchMe(req('/api/v1/me', { method: 'PATCH', token: alice, body: { displayName: 'Alisa' }, headers: { origin: 'https://evil.example' } }));
    expect(fromApp.status).toBe(200);
    const withCookie = await patchMe(req('/api/v1/me', { method: 'PATCH', body: { displayName: 'X' }, headers: { origin: 'https://evil.example', cookie: `bb_session=${alice}` } }));
    expect(withCookie.status).toBe(403);
    expect((await me(req('/api/v1/me'))).status).toBe(401);
  });

  it('builds the home feed from interests and location, and remembers the area only when alerts are on', async () => {
    const guest = await read(await feed(req('/api/v1/feed?city=tashkent&interests=taomlar')));
    expect(guest.body.data).toMatchObject({ city: 'tashkent', located: false, total: 1 });
    expect((guest.body.data.forYou as Array<{ slug: string; isDemo: boolean }>)[0]).toMatchObject({ slug: 'osh', isDemo: false });

    const located = await read(await feed(req('/api/v1/feed?lat=41.3001&lng=69.2701', { token: alice })));
    const nearby = located.body.data.nearby as Array<{ distanceKm: number }>;
    expect(located.body.data.located).toBe(true);
    expect(nearby[0].distanceKm).toBeGreaterThan(0);
    expect(located.body.data.forYou).toEqual([]);
    pinContract('feed', located.body.data);
    const area = () => state.db.prepare(`SELECT notify_lat_e2 AS lat, notify_lng_e2 AS lng, notify_city AS city FROM users WHERE id = 'alice'`).first();
    expect(await area()).toEqual({ lat: null, lng: null, city: null });

    await patchMe(req('/api/v1/me', { method: 'PATCH', token: alice, body: { notifyNearby: true } }));
    await feed(req('/api/v1/feed?lat=41.3001&lng=69.2701', { token: alice }));
    expect(await area()).toEqual({ lat: 4130, lng: 6927, city: 'tashkent' });
    await patchMe(req('/api/v1/me', { method: 'PATCH', token: alice, body: { notifyNearby: false } }));
    expect(await area()).toEqual({ lat: null, lng: null, city: null });
  });

  it('opens a deal and a business with what the customer can do', async () => {
    const detail = await read(await deal(req('/api/v1/deals/osh', { token: alice }), params({ id: 'osh' })));
    expect(detail.body.data).toMatchObject({ slug: 'osh', claimable: true, isDemo: false, favorite: false, following: false, usedCount: 0, activeRedemptionId: null });
    pinContract('deal', detail.body.data);
    expect((await deal(req('/api/v1/deals/nope'), params({ id: 'nope' }))).status).toBe(404);

    const page = await read(await business(req('/api/v1/businesses/kafe'), params({ slug: 'kafe' })));
    expect(page.body.data).toMatchObject({ slug: 'kafe', following: false });
    pinContract('business', page.body.data);
  });

  it('keeps the profile, interests, blocks and codes in step', async () => {
    const saved = await read(await putInterests(req('/api/v1/me/interests', { method: 'PUT', token: alice, body: { categories: ['taomlar', 'no-such'] } })));
    expect(saved.body.data).toEqual({ interests: ['taomlar'] });

    await block(req('/api/v1/me/blocks/biz', { method: 'PUT', token: alice }), params({ businessId: 'biz' }));
    const hidden = await read(await feed(req('/api/v1/feed?city=tashkent', { token: alice })));
    expect(hidden.body.data.total).toBe(0);
    const profile = await read(await me(req('/api/v1/me', { token: alice })));
    expect(profile.body.data).toMatchObject({ interests: ['taomlar'], blockedBusinessIds: ['biz'], notifications: { notifyNearby: false } });
    pinContract('me', profile.body.data);
    await unblock(req('/api/v1/me/blocks/biz', { method: 'DELETE', token: alice }), params({ businessId: 'biz' }));
    expect((await read(await feed(req('/api/v1/feed?city=tashkent', { token: alice })))).body.data.total).toBe(1);

    const { claimDeal } = await import('@/modules/redemptions/service');
    await claimDeal(state.db, { dealId: 'deal', userId: 'alice', branchId: 'br1', idempotencyKey: 'app-test-1', secret: 'test-secret', now: NOW });
    const codes = await read(await myCodes(req('/api/v1/me/redemptions', { token: alice })));
    expect((codes.body.data as unknown as Array<{ status: string; code: string | null }>)[0]).toMatchObject({ status: 'CLAIMED' });
    pinContract('my-codes', codes.body.data);
    expect((await read(await myFavorites(req('/api/v1/me/favorites', { token: alice })))).body.data).toEqual({ live: [], ended: [] });
    expect((await read(await myFollows(req('/api/v1/me/follows', { token: alice })))).body.data).toEqual([]);
  });

  it('registers push devices and takes reports once per person', async () => {
    const pushToken = 'fcm-token-'.padEnd(40, 'x');
    await putDevice(req('/api/v1/me/devices', { method: 'PUT', token: alice, body: { token: pushToken, platform: 'android', locale: 'uz' } }));
    expect(await state.db.prepare(`SELECT user_id AS user, app_build AS build FROM devices WHERE token = ?1`).bind(pushToken).first()).toEqual({ user: 'alice', build: '7' });
    await deleteDevice(req('/api/v1/me/devices', { method: 'DELETE', token: alice, body: { token: pushToken } }));
    expect(await state.db.prepare(`SELECT COUNT(*) AS n FROM devices`).first('n')).toBe(0);

    const first = await report(req('/api/v1/reports', { method: 'POST', token: alice, body: { targetType: 'DEAL', targetId: 'deal', reason: 'WRONG_INFO', comment: 'Narx boshqa' } }));
    const again = await report(req('/api/v1/reports', { method: 'POST', token: alice, body: { targetType: 'DEAL', targetId: 'deal', reason: 'SCAM' } }));
    expect([first.status, again.status]).toEqual([201, 200]);
    expect(await state.db.prepare(`SELECT COUNT(*) AS n, MAX(reason) AS reason FROM reports`).first()).toEqual({ n: 1, reason: 'SCAM' });
    expect((await report(req('/api/v1/reports', { method: 'POST', token: alice, body: { targetType: 'BUSINESS', targetId: 'nope', reason: 'SPAM' } }))).status).toBe(404);
  });

  it('registers a business from the app, with field errors the form can show', async () => {
    const invalid = await read(await registerBusiness(req('/api/v1/businesses', {
      method: 'POST',
      token: alice,
      body: { name: 'K', description: 'Qisqa', categoryId: 'cat_food', city: 'tashkent', phone: '123', address: 'Uy' },
    })));
    expect(invalid.status).toBe(422);
    expect(invalid.body.error).toMatchObject({ code: 'VALIDATION', fields: { name: 'tooShort', description: 'tooShort', phone: 'phone', address: 'tooShort' } });

    const created = await read(await registerBusiness(req('/api/v1/businesses', {
      method: 'POST',
      token: alice,
      body: {
        name: 'Alisa Nonvoyxonasi', description: 'Har kuni issiq tandir non va shirinliklar. Oldindan buyurtma ham olamiz.',
        categoryId: 'cat_food', city: 'tashkent', phone: '90 123 45 67', address: 'Chilonzor 9-kvartal, 12-uy',
        latitude: 41.28, longitude: 69.21, open: '08:00', close: '20:00', telegram: '@alisa_non', instagram: null, website: '',
      },
    })));
    expect(created.status).toBe(201);
    expect(['VERIFIED', 'PENDING']).toContain(created.body.data.status);
    pinContract('business-create', created.body.data);
    const branch = await state.db.prepare(`SELECT name, address, latitude_e6 AS lat, working_hours_json AS hours FROM branches WHERE business_id = ?1`)
      .bind(created.body.data.id).first();
    expect(branch).toEqual({ name: 'Asosiy filial', address: 'Chilonzor 9-kvartal, 12-uy', lat: 41280000, hours: '{"open":"08:00","close":"20:00"}' });

    // The profile lists it right away, with its review state.
    const profile = await read(await me(req('/api/v1/me', { token: alice })));
    const memberships = profile.body.data.memberships as unknown as Array<Record<string, unknown>>;
    expect(memberships).toEqual([expect.objectContaining({ businessId: created.body.data.id, role: 'OWNER', status: created.body.data.status })]);
    pinContract('me-memberships', memberships);
  });

  it('shows each member the business profile their role allows', async () => {
    const owner = (await createSession(state.db, 'owner', { client: 'app' })).token;
    const cashier = (await createSession(state.db, 'cashier', { client: 'app' })).token;
    const { claimDeal } = await import('@/modules/redemptions/service');
    await claimDeal(state.db, { dealId: 'deal', userId: 'alice', branchId: 'br1', idempotencyKey: 'app-test-2', secret: 'test-secret', now: NOW });
    const own = await read(await workspace(req('/api/v1/business/biz', { token: owner }), params({ businessId: 'biz' })));
    expect(own.status).toBe(200);
    expect(own.body.data).toMatchObject({
      business: { id: 'biz', slug: 'kafe', status: 'VERIFIED', suspended: false },
      role: 'OWNER',
      can: { edit: true, deals: true, validate: true, analytics: true },
      stats: { live: 1, claimsToday: 1 },
      recent: [{ status: 'CLAIMED', dealTitle: 'Osh', customerName: 'Alice Karimova' }],
    });
    expect((own.body.data.setup as unknown as Array<{ key: string }>).map((item) => item.key)).toContain('deal');
    pinContract('business-workspace', own.body.data);

    const counter = await read(await workspace(req('/api/v1/business/biz', { token: cashier }), params({ businessId: 'biz' })));
    expect(counter.body.data).toMatchObject({ role: 'CASHIER', can: { edit: false, validate: true, analytics: false }, stats: null, recent: [], setup: [] });
    expect((await workspace(req('/api/v1/business/biz', { token: alice }), params({ businessId: 'biz' }))).status).toBe(403);
  });

  it('lets an owner add a deal with a photo from the app and run it; cashiers cannot', async () => {
    const owner = (await createSession(state.db, 'owner', { client: 'app' })).token;
    const cashier = (await createSession(state.db, 'cashier', { client: 'app' })).token;
    // A 640×480 PNG header is enough for the server's checks.
    const png = new Uint8Array(64);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(png.buffer).setUint32(16, 640);
    new DataView(png.buffer).setUint32(20, 480);
    const upload = (token: string) => {
      const form = new FormData();
      form.set('kind', 'DEAL');
      form.set('file', new Blob([png], { type: 'image/png' }), 'photo.png');
      return uploadMedia(new Request('https://bugunbor.uz/api/v1/business/biz/media', { method: 'POST', headers: { ...APP_HEADERS, authorization: `Bearer ${token}` }, body: form }), params({ businessId: 'biz' }));
    };
    expect((await upload(cashier)).status).toBe(403);
    const media = await read(await upload(owner));
    expect(media.status).toBe(201);
    pinContract('media-upload', media.body.data);
    const photoId = media.body.data.id as string;

    const input = {
      title: 'Somsa va choy', description: 'Tandir somsa va bir choynak ko‘k choy, issiq holda.', terms: 'Faqat zalda. Boshqa chegirmalar bilan qo‘shilmaydi.',
      categoryId: 'cat_food', visual: 'samsa', originalPrice: 20000, price: 14000, startsAt: '2026-09-25T15:00', endsAt: '2026-09-25T19:00',
      quantity: 30, perCustomerLimit: 2, claimTtlMinutes: 60, branchIds: ['br1'], photoId,
    };
    const action = (token: string, body: unknown) => businessAction(req('/api/v1/business/biz', { method: 'POST', token, body }), params({ businessId: 'biz' }));

    const invalid = await read(await action(owner, { type: 'deal.create', input: { ...input, price: 20000 }, submit: true }));
    // Field paths are as sent (the form's fields sit under `input`).
    expect(invalid).toMatchObject({ status: 422, body: { error: { code: 'VALIDATION', fields: { 'input.price': 'priceOrder' } } } });
    expect((await action(cashier, { type: 'deal.create', input, submit: true })).status).toBe(403);

    const created = await read(await action(owner, { type: 'deal.create', input, submit: true }));
    expect(created.status).toBe(201);
    expect(['ACTIVE', 'PENDING_REVIEW']).toContain(created.body.data.status);
    pinContract('deal-saved', created.body.data);
    const dealId = created.body.data.id as string;

    const list = await read(await businessDeals(req('/api/v1/business/biz/deals', { token: owner }), params({ businessId: 'biz' })));
    expect(list.status).toBe(200);
    const listed = (list.body.data as unknown as Array<Record<string, unknown>>).find((item) => item.id === dealId);
    expect(listed).toMatchObject({ title: 'Somsa va choy', price: 14000, originalPrice: 20000, discountPercent: 30, total: 30, remaining: 30, claims: 0, photo: `/media/${photoId}` });
    expect(listed).not.toHaveProperty('autoNote');
    pinContract('business-deals', list.body.data);
    expect((await businessDeals(req('/api/v1/business/biz/deals', { token: cashier }), params({ businessId: 'biz' }))).status).toBe(403);

    // The edit form gets back exactly what it sent.
    const detail = await read(await businessDeal(req(`/api/v1/business/biz/deals/${dealId}`, { token: owner }), params({ businessId: 'biz', dealId })));
    expect(detail.body.data).toMatchObject({ title: input.title, startsAt: input.startsAt, endsAt: input.endsAt, branchIds: ['br1'], photoId: input.photoId, total: 30, perCustomerLimit: 2 });
    pinContract('business-deal', detail.body.data);

    // A draft: saved, changed, sent for review, then taken off the air.
    const draft = await read(await action(owner, { type: 'deal.create', input: { ...input, title: 'Somsa kombo', photoId: null }, submit: false }));
    expect(draft.body.data.status).toBe('DRAFT');
    const draftId = draft.body.data.id as string;
    const updated = await read(await action(owner, { type: 'deal.update', dealId: draftId, input: { ...input, title: 'Somsa kombo (2 ta)', photoId: null }, submit: false }));
    expect(updated.body.data.status).toBe('DRAFT');
    const submitted = await read(await action(owner, { type: 'deal.transition', dealId: draftId, action: 'submit' }));
    expect(['ACTIVE', 'PENDING_REVIEW']).toContain(submitted.body.data.status);
    if (submitted.body.data.status === 'ACTIVE') {
      expect((await read(await action(owner, { type: 'deal.transition', dealId: draftId, action: 'pause' }))).body.data.status).toBe('PAUSED');
      expect((await read(await action(owner, { type: 'deal.transition', dealId: draftId, action: 'resume' }))).body.data.status).toBe('ACTIVE');
    }
    const copy = await read(await action(owner, { type: 'deal.duplicate', dealId: draftId }));
    expect(copy.status).toBe(201);
    expect((await read(await action(owner, { type: 'deal.transition', dealId: copy.body.data.id, action: 'delete' }))).body.data.status).toBe('DELETED');
    const after = await read(await businessDeals(req('/api/v1/business/biz/deals', { token: owner }), params({ businessId: 'biz' })));
    expect((after.body.data as unknown as Array<{ id: string }>).map((item) => item.id)).not.toContain(copy.body.data.id);
  });

  it('lets the only owner close the business together with the account', async () => {
    const owner = (await createSession(state.db, 'owner', { client: 'app' })).token;
    const refused = await read(await deleteMe(req('/api/v1/me', { method: 'DELETE', token: owner })));
    expect(refused).toMatchObject({ status: 409, body: { error: { code: 'SOLE_OWNER' } } });
    const done = await read(await deleteMe(req('/api/v1/me', { method: 'DELETE', token: owner, body: { closeBusinesses: true } })));
    expect(done.body.data).toEqual({ deleted: true, closedBusinesses: ['Kafe'] });
    expect(await state.db.prepare(`SELECT b.deleted_at IS NOT NULL AS closed, d.status FROM businesses b JOIN deals d ON d.business_id = b.id WHERE b.id = 'biz'`).first())
      .toEqual({ closed: 1, status: 'ARCHIVED' });
    expect((await me(req('/api/v1/me', { token: owner }))).status).toBe(401);
  });

  it('opens the store reviewer account only with the secret code', async () => {
    expect((await reviewLogin(req('/api/v1/auth/review', { method: 'POST', body: { code: 'whatever-code' } }))).status).toBe(404);
    state.reviewCode = 'review-code-123456';
    expect((await reviewLogin(req('/api/v1/auth/review', { method: 'POST', body: { code: 'wrong-code-000000' } }))).status).toBe(403);
    const ok = await read(await reviewLogin(req('/api/v1/auth/review', { method: 'POST', body: { code: 'review-code-123456' } })));
    const profile = await read(await me(req('/api/v1/me', { token: ok.body.data.token as string })));
    expect(profile.body.data.user).toMatchObject({ id: 'usr_review', displayName: 'Store Review' });
    expect(await state.db.prepare(`SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'user.review_login'`).first('n')).toBe(1);
  });

  it('publishes App Links only for well-formed certificate fingerprints', () => {
    const print = Array.from({ length: 32 }, () => 'ab').join(':');
    expect(assetLinks(undefined)).toEqual([]);
    expect(assetLinks('nonsense')).toEqual([]);
    expect(assetLinks(` ${print} ,bad`)[0].target).toEqual({ namespace: 'android_app', package_name: 'uz.bugunbor.app', sha256_cert_fingerprints: [print.toUpperCase()] });
  });
});
