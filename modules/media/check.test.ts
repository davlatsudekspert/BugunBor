import { afterEach, describe, expect, it, vi } from 'vitest';

import { uz } from '@/lib/i18n/uz';
import { toDbTime } from '@/lib/time';
import { NOW, marketplace } from '@/test/fixtures';
import { processNotifications } from '@/modules/notifications/service';
import { PHOTO_RULES, checkPhoto, parseGeminiVerdict, parseVerdict, photoChecker, type PhotoCheckConfig } from './check';
import { photoCheckStatus } from './check-status';
import { recheckPhotos } from './recheck';
import { saveMedia } from './service';

// The automatic photo check, with Anthropic's Messages API and Google's
// generateContent played by a stub.

const errorOf = async (promise: Promise<unknown>) =>
  promise.then(() => null, (error: { code?: string; status?: number }) => ({ code: error.code, status: error.status }));
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

function webp(width: number, height: number) {
  const bytes = new Uint8Array(64);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
  };
  text(0, 'RIFF');
  text(8, 'WEBP');
  text(12, 'VP8X');
  const uint24 = (offset: number, value: number) => bytes.set([value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff], offset);
  uint24(24, width - 1);
  uint24(27, height - 1);
  return bytes;
}

const claudeSays = (input: Record<string, unknown>) =>
  Response.json({ content: [{ type: 'tool_use', id: 'toolu_1', name: 'verdict', input }], stop_reason: 'tool_use' });
const geminiSays = (input: Record<string, unknown>) =>
  Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(input) }] }, finishReason: 'STOP' }] });
const noCredit = () =>
  Response.json({ type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } }, { status: 400 });
const quota = () => Response.json({ error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } }, { status: 429 });
const timeout = () => Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });

type Provider = 'claude' | 'gemini';

/** Stand-ins for both services that record what they were sent; each answers in turn, then repeats its last answer. */
function stub(replies: Partial<Record<Provider, Array<Response | Error>>>) {
  const calls: Array<{ provider: Provider; url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const provider: Provider = url.startsWith('https://api.anthropic.com/') ? 'claude' : 'gemini';
    calls.push({ provider, url, headers: init?.headers as Record<string, string>, body: JSON.parse(init?.body as string) });
    const list = replies[provider] ?? [];
    const reply = list[Math.min(calls.filter((call) => call.provider === provider).length, list.length) - 1];
    if (!reply) throw new Error(`${provider} was not expected to be asked`);
    if (reply instanceof Error) throw reply;
    return reply.clone();
  });
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}

const claudeOnly: PhotoCheckConfig = { claude: { apiKey: 'claude-test-key', model: null }, gemini: null };
const geminiOnly: PhotoCheckConfig = { claude: null, gemini: { apiKey: 'gemini-test-key', model: null } };
const both: PhotoCheckConfig = { claude: claudeOnly.claude, gemini: geminiOnly.gemini };

const mediaRow = (db: D1Database, id: string) =>
  db.prepare(`SELECT check_status AS status, check_after AS after, check_attempts AS tries FROM media WHERE id = ?1`).bind(id).first();

function telegram() {
  const sent: Array<{ chatId: string; text: string; url: string }> = [];
  const sender = {
    async sendMessage(chatId: number | string, text: string, markup?: unknown) {
      sent.push({ chatId: String(chatId), text, url: (markup as { inline_keyboard: Array<Array<{ url: string }>> }).inline_keyboard[0][0].url });
    },
  };
  return { sent, sender };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('photo check', () => {
  it('with only Gemini: sends it the photo with the same rules and reads its verdict', async () => {
    const { fetcher, calls } = stub({ gemini: [geminiSays({ allowed: true, reason: 'NONE', note: 'Plov on a plate.' })] });
    expect(await checkPhoto(geminiOnly, webp(800, 600), 'image/webp', fetcher)).toEqual({ status: 'CHECKED', provider: 'gemini', verdict: { allowed: true }, failures: [] });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent');
    // The key goes in a header, never in the address.
    expect(call.headers['x-goog-api-key']).toBe('gemini-test-key');
    expect(call.url).not.toContain('gemini-test-key');
    expect(call.body.systemInstruction).toEqual({ parts: [{ text: PHOTO_RULES }] });
    const parts = (call.body.contents as Array<{ parts: Array<{ inlineData?: { mimeType: string; data: string } }> }>)[0].parts;
    expect(parts[0].inlineData).toMatchObject({ mimeType: 'image/webp', data: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/) });
    expect(call.body.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseSchema: { required: ['allowed', 'reason', 'note'] } });

    // GEMINI_MODEL picks another model.
    const other = stub({ gemini: [geminiSays({ allowed: true, reason: 'NONE', note: 'Tea.' })] });
    await checkPhoto({ claude: null, gemini: { apiKey: 'gemini-test-key', model: 'gemini-2.5-flash' } }, webp(800, 600), 'image/webp', other.fetcher);
    expect(other.calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  });

  it('with only Claude: asks for the verdict tool with the same rules', async () => {
    const { fetcher, calls } = stub({ claude: [claudeSays({ allowed: false, reason: 'RELIGIOUS', note: 'A mosque behind the shop.' })] });
    expect(await checkPhoto(claudeOnly, webp(800, 600), 'image/webp', fetcher)).toEqual({
      status: 'CHECKED',
      provider: 'claude',
      verdict: { allowed: false, reason: 'RELIGIOUS', note: 'A mosque behind the shop.', code: 'PHOTO_RELIGIOUS' },
      failures: [],
    });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call.headers['x-api-key']).toBe('claude-test-key');
    expect(call.body.model).toBe('claude-sonnet-5');
    expect(call.body.system).toBe(PHOTO_RULES);
    expect(call.body.tool_choice).toEqual({ type: 'tool', name: 'verdict' });
    const content = (call.body.messages as Array<{ content: Array<{ type: string; source?: { media_type: string } }> }>)[0].content;
    expect(content[0]).toMatchObject({ type: 'image', source: { media_type: 'image/webp' } });
  });

  it('asks Claude first, and Gemini when Claude fails', async () => {
    const fallback = stub({ claude: [noCredit()], gemini: [geminiSays({ allowed: false, reason: 'MILITARY', note: 'Camouflage jacket.' })] });
    expect(await checkPhoto(both, webp(800, 600), 'image/webp', fallback.fetcher)).toEqual({
      status: 'CHECKED',
      provider: 'gemini',
      verdict: { allowed: false, reason: 'MILITARY', note: 'Camouflage jacket.', code: 'PHOTO_MILITARY' },
      failures: [{ provider: 'claude', error: 'HTTP 400: Your credit balance is too low to access the Anthropic API.' }],
    });
    expect(fallback.calls.map((call) => call.provider)).toEqual(['claude', 'gemini']);

    // Claude answered: Gemini is not asked.
    const first = stub({ claude: [claudeSays({ allowed: true, reason: 'NONE', note: 'Coffee.' })], gemini: [geminiSays({ allowed: true, reason: 'NONE', note: 'Coffee.' })] });
    expect(await checkPhoto(both, webp(800, 600), 'image/webp', first.fetcher)).toMatchObject({ status: 'CHECKED', provider: 'claude' });
    expect(first.calls.map((call) => call.provider)).toEqual(['claude']);

    // Neither answers: no verdict, each failure named; one try each.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const down = stub({ claude: [new Error('socket hang up')], gemini: [timeout()] });
    expect(await checkPhoto(both, webp(800, 600), 'image/webp', down.fetcher)).toEqual({
      status: 'UNAVAILABLE',
      failures: [{ provider: 'claude', error: 'network error' }, { provider: 'gemini', error: 'no answer in 15 s' }],
    });
    expect(down.calls).toHaveLength(2);
  });

  it('reads both answer formats; a photo Gemini will not look at is refused', () => {
    const refused = (reason: string) => parseVerdict({ content: [{ type: 'tool_use', name: 'verdict', input: { allowed: false, reason, note: 'x' } }] });
    expect(refused('MILITARY')).toMatchObject({ allowed: false, reason: 'MILITARY', code: 'PHOTO_MILITARY' });
    expect(refused('POLITICAL')).toMatchObject({ code: 'PHOTO_POLITICAL' });
    expect(refused('PERSONAL_DATA')).toMatchObject({ code: 'PHOTO_PERSONAL_DATA' });
    expect(refused('GAMBLING')).toMatchObject({ code: 'PHOTO_REJECTED' });
    // A refusal without a known reason is still a refusal.
    expect(refused('NONE')).toMatchObject({ allowed: false, reason: 'OTHER', code: 'PHOTO_REJECTED' });
    expect(parseVerdict({ content: [{ type: 'text', text: 'Looks fine' }] })).toBeNull();
    expect(parseVerdict(null)).toBeNull();

    const gemini = (text: string) => parseGeminiVerdict({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
    expect(gemini('{"allowed":false,"reason":"POLITICAL","note":"A national flag."}')).toMatchObject({ allowed: false, reason: 'POLITICAL', code: 'PHOTO_POLITICAL' });
    expect(gemini('{"allowed":true,"reason":"NONE","note":"Bread."}')).toEqual({ allowed: true });
    expect(parseGeminiVerdict({ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } })).toMatchObject({ allowed: false, reason: 'OTHER', code: 'PHOTO_REJECTED' });
    expect(parseGeminiVerdict({ candidates: [{ finishReason: 'SAFETY' }] })).toMatchObject({ allowed: false, reason: 'OTHER' });
    expect(gemini('Looks fine')).toBeNull();
    expect(parseGeminiVerdict(null)).toBeNull();
    for (const code of ['PHOTO_MILITARY', 'PHOTO_POLITICAL', 'PHOTO_RELIGIOUS', 'PHOTO_REJECTED'] as const) expect(uz.errors[code]).toBeTruthy();
  });

  it('keeps a passed photo, and refuses one with a flag without keeping anything of it', async () => {
    const db = await marketplace();
    const passed = stub({ gemini: [geminiSays({ allowed: true, reason: 'NONE', note: 'Samsa.' })] });
    const kept = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes: webp(800, 600), check: photoChecker(geminiOnly, passed.fetcher) }, NOW);
    expect(await mediaRow(db, kept.id)).toEqual({ status: 'PASSED', after: null, tries: 0 });

    const flag = stub({ claude: [noCredit()], gemini: [geminiSays({ allowed: false, reason: 'POLITICAL', note: 'A national flag behind the counter.' })] });
    const refused = await errorOf(saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'COVER', bytes: webp(900, 600), check: photoChecker(both, flag.fetcher) }, later(1)));
    expect(refused).toEqual({ code: 'PHOTO_POLITICAL', status: 422 });
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM media`).first()).toEqual({ n: 1 });
    const audit = await db.prepare(`SELECT action, business_id AS businessId, reason FROM audit_logs WHERE action = 'media.refused'`).first();
    expect(audit).toEqual({ action: 'media.refused', businessId: 'biz', reason: 'COVER POLITICAL: A national flag behind the counter.' });

    // What Admin → Sozlamalar shows.
    expect(await photoCheckStatus(db)).toEqual({
      lastOk: { at: toDbTime(later(1)), provider: 'gemini' },
      lastError: { at: toDbTime(later(1)), failures: [{ provider: 'claude', error: 'HTTP 400: Your credit balance is too low to access the Anthropic API.' }] },
      waiting: 0,
    });
  });

  it('when neither answers: keeps the photo unchecked, queues it and tells the admins once a day', async () => {
    const db = await marketplace();
    await db.batch([
      db.prepare(`INSERT INTO users(id, role, display_name, phone, locale, telegram_user_id) VALUES ('admin', 'ADMIN', 'Admin', '+998900000011', 'uz', '7100')`),
      db.prepare(`UPDATE users SET telegram_user_id = '7009' WHERE id = 'mod'`),
    ]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const down = stub({ claude: [noCredit()], gemini: [quota()] });
    const upload = (kind: 'DEAL' | 'COVER', width: number, now: Date) =>
      saveMedia(db, { businessId: 'biz', userId: 'owner', kind, bytes: webp(width, 600), check: photoChecker(both, down.fetcher) }, now);

    const first = await upload('DEAL', 800, NOW);
    expect(await mediaRow(db, first.id)).toEqual({ status: 'UNCHECKED', after: toDbTime(later(15)), tries: 1 });
    await upload('COVER', 900, later(30));
    const alerts = () => db.prepare(`SELECT user_id AS userId, payload_json AS payload FROM notifications WHERE kind = 'PHOTO_CHECK_DOWN' ORDER BY created_at`).all<{ userId: string; payload: string }>();
    // Admins only, and one message a day however many uploads fail.
    expect((await alerts()).results.map((row) => row.userId)).toEqual(['admin']);
    expect(JSON.parse((await alerts()).results[0].payload)).toEqual({
      errors: 'Claude: HTTP 400: Your credit balance is too low to access the Anthropic API.; Gemini: HTTP 429: Resource has been exhausted (e.g. check quota).',
    });
    await upload('DEAL', 1000, later(24 * 60));
    expect((await alerts()).results).toHaveLength(2);

    expect(await photoCheckStatus(db)).toMatchObject({ lastOk: null, lastError: { at: toDbTime(later(24 * 60)) }, waiting: 3 });

    const { sent, sender } = telegram();
    await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(24 * 60) });
    expect(sent.map((message) => message.chatId)).toEqual(['7100', '7100']);
    expect(sent[0].text).toContain('Rasm tekshiruvi ishlamayapti: Claude: HTTP 400');
    expect(sent[0].text).toContain('Navbatda: 3 ta rasm');
    expect(sent[0].url).toBe('https://bugunbor.uz/admin/settings#photo-check');
  });

  it('checks a waiting photo again: waits longer while the services are down, then keeps or removes it', async () => {
    const db = await marketplace();
    await db.prepare(`UPDATE users SET telegram_user_id = '7001' WHERE id = 'owner'`).run();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const down = stub({ gemini: [quota()] });
    const keep = (kind: 'DEAL' | 'LOGO', width: number, now: Date) =>
      saveMedia(db, { businessId: 'biz', userId: 'owner', kind, bytes: webp(width, width), check: photoChecker(geminiOnly, down.fetcher) }, now);
    const photo = await keep('DEAL', 800, NOW);
    const logo = await keep('LOGO', 512, later(10));
    await db.batch([
      db.prepare(`UPDATE deals SET photo_id = ?1 WHERE id = 'deal'`).bind(photo.id),
      db.prepare(`UPDATE businesses SET logo_id = ?1 WHERE id = 'biz'`).bind(logo.id),
    ]);

    // Not due yet: nothing is asked.
    expect(await recheckPhotos(db, photoChecker(geminiOnly, down.fetcher)!, later(5))).toEqual([]);
    expect(down.calls).toHaveLength(2);
    // Still down: the next try waits longer (15 min, then 1 h).
    expect(await recheckPhotos(db, photoChecker(geminiOnly, down.fetcher)!, later(20))).toEqual([]);
    expect(await mediaRow(db, photo.id)).toEqual({ status: 'UNCHECKED', after: toDbTime(later(80)), tries: 2 });

    const allowed = stub({ gemini: [geminiSays({ allowed: true, reason: 'NONE', note: 'A logo with a teapot.' })] });
    expect(await recheckPhotos(db, photoChecker(geminiOnly, allowed.fetcher)!, later(30))).toEqual([]);
    expect(await mediaRow(db, logo.id)).toEqual({ status: 'PASSED', after: null, tries: 1 });

    const refused = stub({ gemini: [geminiSays({ allowed: false, reason: 'MILITARY', note: 'A soldier in uniform.' })] });
    expect(await recheckPhotos(db, photoChecker(geminiOnly, refused.fetcher)!, later(90))).toEqual([photo.id]);
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM media WHERE id = ?1`).bind(photo.id).first()).toEqual({ n: 0 });
    expect(await db.prepare(`SELECT photo_id AS photoId FROM deals WHERE id = 'deal'`).first()).toEqual({ photoId: null });
    expect(await db.prepare(`SELECT logo_id AS logoId FROM businesses WHERE id = 'biz'`).first()).toEqual({ logoId: logo.id });
    expect(await db.prepare(`SELECT actor_user_id AS actor, reason FROM audit_logs WHERE action = 'media.refused'`).first()).toEqual({
      actor: null,
      reason: 'DEAL MILITARY: A soldier in uniform. (checked again)',
    });
    expect(await photoCheckStatus(db)).toMatchObject({ lastOk: { provider: 'gemini' }, waiting: 0 });

    // The business is told what was taken down and why.
    const { sent, sender } = telegram();
    await processNotifications(db, sender, { appUrl: 'https://bugunbor.uz', now: later(90) });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ chatId: '7001', url: 'https://bugunbor.uz/business/switch/biz?next=%2Fbusiness%2Fdeals' });
    expect(sent[0].text).toContain('<b>Kafe</b>: rasm (aksiya rasmi) qayta tekshiruvda qoidaga zid');
    expect(sent[0].text).toContain(uz.errors.PHOTO_MILITARY);
  });

  it('counts refused photos in the daily limit, so refusals cannot be run up without end', async () => {
    const db = await marketplace();
    const flag = stub({ gemini: [geminiSays({ allowed: false, reason: 'MILITARY', note: 'Camouflage jacket.' })] });
    const upload = () => saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes: webp(800, 600), check: photoChecker(geminiOnly, flag.fetcher) });
    for (let index = 0; index < 100; index += 1) expect(await errorOf(upload())).toMatchObject({ code: 'PHOTO_MILITARY' });
    expect(await errorOf(upload())).toEqual({ code: 'MEDIA_LIMIT', status: 429 });
    // The limit was reached before asking again.
    expect(flag.calls).toHaveLength(100);
  });

  it('without a key keeps photos as before, marked unchecked and not queued', async () => {
    expect(photoChecker(null)).toBeNull();
    expect(photoChecker({ claude: null, gemini: null })).toBeNull();
    const db = await marketplace();
    const kept = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'LOGO', bytes: webp(512, 512), check: photoChecker(null) });
    expect(await mediaRow(db, kept.id)).toEqual({ status: 'UNCHECKED', after: null, tries: 0 });
    expect(await photoCheckStatus(db)).toEqual({ lastOk: null, lastError: null, waiting: 0 });
  });
});
