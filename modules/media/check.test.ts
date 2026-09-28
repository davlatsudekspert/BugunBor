import { describe, expect, it, vi } from 'vitest';

import { uz } from '@/lib/i18n/uz';
import { marketplace } from '@/test/fixtures';
import { PHOTO_RULES, checkPhoto, parseVerdict, photoChecker } from './check';
import { saveMedia } from './service';

// The automatic photo check, with Anthropic's Messages API played by a stub.

const errorOf = async (promise: Promise<unknown>) =>
  promise.then(() => null, (error: { code?: string; status?: number }) => ({ code: error.code, status: error.status }));

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

const answer = (input: Record<string, unknown>) =>
  Response.json({ content: [{ type: 'tool_use', id: 'toolu_1', name: 'verdict', input }], stop_reason: 'tool_use' });

/** A stand-in for the API that records what it was sent. */
function stub(...replies: Array<Response | Error>) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: init?.headers as Record<string, string>, body: JSON.parse(init?.body as string) });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply instanceof Error) throw reply;
    return reply.clone();
  });
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}

const config = { apiKey: 'test-key', model: null };

describe('photo check', () => {
  it('sends the photo with the rules and asks for the verdict tool', async () => {
    const { fetcher, calls } = stub(answer({ allowed: true, reason: 'NONE', note: 'Plov on a plate.' }));
    expect(await checkPhoto(config, webp(800, 600), 'image/webp', fetcher)).toEqual({ allowed: true });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call.headers['x-api-key']).toBe('test-key');
    expect(call.body.model).toBe('claude-sonnet-5');
    expect(call.body.system).toBe(PHOTO_RULES);
    expect(call.body.tool_choice).toEqual({ type: 'tool', name: 'verdict' });
    const content = (call.body.messages as Array<{ content: Array<{ type: string; source?: { media_type: string } }> }>)[0].content;
    expect(content[0]).toMatchObject({ type: 'image', source: { media_type: 'image/webp' } });
  });

  it('turns each refusal into the message the uploader reads', () => {
    const refused = (reason: string) => parseVerdict({ content: [{ type: 'tool_use', name: 'verdict', input: { allowed: false, reason, note: 'x' } }] });
    expect(refused('MILITARY')).toMatchObject({ allowed: false, reason: 'MILITARY', code: 'PHOTO_MILITARY' });
    expect(refused('POLITICAL')).toMatchObject({ code: 'PHOTO_POLITICAL' });
    expect(refused('RELIGIOUS')).toMatchObject({ code: 'PHOTO_RELIGIOUS' });
    expect(refused('PERSONAL_DATA')).toMatchObject({ code: 'PHOTO_PERSONAL_DATA' });
    expect(refused('GAMBLING')).toMatchObject({ code: 'PHOTO_REJECTED' });
    // A refusal without a known reason is still a refusal.
    expect(refused('NONE')).toMatchObject({ allowed: false, reason: 'OTHER', code: 'PHOTO_REJECTED' });
    expect(parseVerdict({ content: [{ type: 'text', text: 'Looks fine' }] })).toBeNull();
    expect(parseVerdict(null)).toBeNull();
    for (const code of ['PHOTO_MILITARY', 'PHOTO_POLITICAL', 'PHOTO_RELIGIOUS', 'PHOTO_REJECTED', 'PHOTO_CHECK_UNAVAILABLE'] as const) {
      expect(uz.errors[code]).toBeTruthy();
    }
  });

  it('tries a busy service once more, then asks the uploader to try again', async () => {
    const busy = stub(new Response('overloaded', { status: 529 }), answer({ allowed: true, reason: 'NONE', note: 'Coffee.' }));
    expect(await checkPhoto(config, webp(800, 600), 'image/webp', busy.fetcher)).toEqual({ allowed: true });
    expect(busy.calls).toHaveLength(2);

    const down = stub(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await errorOf(checkPhoto(config, webp(800, 600), 'image/webp', down.fetcher))).toEqual({ code: 'PHOTO_CHECK_UNAVAILABLE', status: 503 });
    expect(down.calls).toHaveLength(2);

    // A wrong key is not retried.
    const wrongKey = stub(new Response('{}', { status: 401 }));
    expect(await errorOf(checkPhoto(config, webp(800, 600), 'image/webp', wrongKey.fetcher))).toMatchObject({ code: 'PHOTO_CHECK_UNAVAILABLE' });
    expect(wrongKey.calls).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it('keeps a passed photo, and refuses one with a flag without keeping anything of it', async () => {
    const db = await marketplace();
    const passed = stub(answer({ allowed: true, reason: 'NONE', note: 'Samsa.' }));
    const kept = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes: webp(800, 600), check: photoChecker(config, passed.fetcher) });
    expect(await db.prepare(`SELECT check_status AS status FROM media WHERE id = ?1`).bind(kept.id).first()).toEqual({ status: 'PASSED' });

    const flag = stub(answer({ allowed: false, reason: 'POLITICAL', note: 'A national flag behind the counter.' }));
    const refused = await errorOf(saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'COVER', bytes: webp(900, 600), check: photoChecker(config, flag.fetcher) }));
    expect(refused).toEqual({ code: 'PHOTO_POLITICAL', status: 422 });
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM media`).first()).toEqual({ n: 1 });
    const audit = await db.prepare(`SELECT action, business_id AS businessId, reason FROM audit_logs WHERE action = 'media.refused'`).first();
    expect(audit).toEqual({ action: 'media.refused', businessId: 'biz', reason: 'COVER POLITICAL: A national flag behind the counter.' });
  });

  it('counts refused photos in the daily limit, so refusals cannot be run up without end', async () => {
    const db = await marketplace();
    const flag = stub(answer({ allowed: false, reason: 'MILITARY', note: 'Camouflage jacket.' }));
    const upload = () => saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'DEAL', bytes: webp(800, 600), check: photoChecker(config, flag.fetcher) });
    for (let index = 0; index < 100; index += 1) expect(await errorOf(upload())).toMatchObject({ code: 'PHOTO_MILITARY' });
    expect(await errorOf(upload())).toEqual({ code: 'MEDIA_LIMIT', status: 429 });
    // The limit was reached before asking again.
    expect(flag.calls).toHaveLength(100);
  });

  it('without a key keeps photos as before, marked unchecked', async () => {
    expect(photoChecker(null)).toBeNull();
    const db = await marketplace();
    const kept = await saveMedia(db, { businessId: 'biz', userId: 'owner', kind: 'LOGO', bytes: webp(512, 512), check: photoChecker(null) });
    expect(await db.prepare(`SELECT check_status AS status FROM media WHERE id = ?1`).bind(kept.id).first()).toEqual({ status: 'UNCHECKED' });
  });
});
