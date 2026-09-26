import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/ru';
import { uz } from '@/lib/i18n/uz';
import { GUIDES, GUIDES_PAGE, GUIDE_SOURCE, PROMO, clock, guideCaptions, guideFile, guidePoster, guideVideo, isoDuration, serveGuideVideo } from './guides';

const publicDir = path.resolve(__dirname, '../public');

describe('video guides', () => {
  it('has every video and poster it lists, and nothing else', () => {
    const listed = [PROMO, ...GUIDES].flatMap((guide) => [guideFile(guide.slug), guidePoster(guide.slug), guideCaptions(guide.slug)]);
    for (const file of listed) expect(fs.existsSync(path.join(publicDir, file)), file).toBe(true);
    const present = fs.readdirSync(path.join(publicDir, GUIDES_PAGE)).map((name) => `${GUIDES_PAGE}/${name}`);
    expect(present.sort()).toEqual([...listed].sort());
    // Captions are WebVTT and end where the video does.
    for (const guide of [PROMO, ...GUIDES]) {
      const captions = fs.readFileSync(path.join(publicDir, guideCaptions(guide.slug)), 'utf8');
      expect(captions.startsWith('WEBVTT\n')).toBe(true);
      const last = [...captions.matchAll(/--> (\d\d):(\d\d):(\d\d)\.\d{3}/g)].at(-1)!;
      expect(Math.abs(Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]) - guide.seconds)).toBeLessThanOrEqual(1);
    }
  });

  it('names and describes every guide in both languages', () => {
    for (const t of [uz, ru]) {
      for (const guide of GUIDES) {
        expect(t.guides.items[guide.slug].title.length).toBeGreaterThan(3);
        expect(t.guides.items[guide.slug].text.length).toBeGreaterThan(10);
      }
      expect(t.footer.guides.length).toBeGreaterThan(3);
    }
    expect(Object.keys(uz.guides.items).sort()).toEqual(GUIDES.map((guide) => guide.slug).sort());
  });

  it('shows lengths as a clock and as search engines read them', () => {
    expect([clock(25), clock(66), clock(120)]).toEqual(['0:25', '1:06', '2:00']);
    expect([isoDuration(25), isoDuration(66), isoDuration(120)]).toEqual(['PT25S', 'PT1M6S', 'PT2M0S']);
  });

  it('sends a video in parts, as Safari asks, and only the listed ones', async () => {
    const bytes = fs.readFileSync(path.join(publicDir, guideFile(PROMO.slug)));
    const requested: string[] = [];
    const assets = {
      fetch: async (input: Request | string) => {
        const url = new URL(input instanceof Request ? input.url : input);
        requested.push(url.pathname);
        return new Response(bytes, { headers: { 'content-type': 'video/mp4', etag: '"v1"' } });
      },
    } as unknown as Fetcher;
    const ask = (path: string, init?: RequestInit) => serveGuideVideo(new Request(`https://bugunbor.uz${path}`, init), assets);

    expect(guideVideo(PROMO.slug)).toBe('/qollanma/video/nima-uchun-bugunbor.mp4');
    const first = (await ask(guideVideo(PROMO.slug), { headers: { range: 'bytes=0-1' } }))!;
    expect([first.status, first.headers.get('content-range'), first.headers.get('accept-ranges'), first.headers.get('content-type')]).toEqual([206, `bytes 0-1/${bytes.length}`, 'bytes', 'video/mp4']);
    expect([...new Uint8Array(await first.arrayBuffer())]).toEqual([...bytes.subarray(0, 2)]);
    expect(requested).toEqual(['/qollanma/nima-uchun-bugunbor.mp4']);

    const tail = (await ask(guideVideo(PROMO.slug), { headers: { range: 'bytes=-10' } }))!;
    expect([tail.status, tail.headers.get('content-length')]).toEqual([206, '10']);
    const rest = (await ask(guideVideo(PROMO.slug), { headers: { range: `bytes=${bytes.length - 5}-` } }))!;
    expect(rest.headers.get('content-range')).toBe(`bytes ${bytes.length - 5}-${bytes.length - 1}/${bytes.length}`);
    const whole = (await ask(guideVideo(PROMO.slug)))!;
    expect([whole.status, whole.headers.get('content-length'), whole.headers.get('etag')]).toEqual([200, String(bytes.length), '"v1"']);
    const past = (await ask(guideVideo(PROMO.slug), { headers: { range: `bytes=${bytes.length}-` } }))!;
    expect([past.status, past.headers.get('content-range')]).toEqual([416, `bytes */${bytes.length}`]);
    const head = (await ask(guideVideo(PROMO.slug), { method: 'HEAD', headers: { range: 'bytes=0-99' } }))!;
    expect([head.status, head.headers.get('content-length'), await head.text()]).toEqual([206, '100', '']);

    expect((await ask('/qollanma/video/boshqa.mp4'))!.status).toBe(404);
    expect((await ask(guideVideo(PROMO.slug), { method: 'POST' }))!.status).toBe(404);
    expect(await ask('/qollanma')).toBeNull();
    // Without the binding the file is read from the repository's CDN copy; if that fails, the player gets the static file.
    const cdn: string[] = [];
    const fromCdn = (async (input: string | URL | Request) => {
      cdn.push(input instanceof Request ? input.url : input.toString());
      return new Response(bytes, { headers: { 'content-type': 'video/mp4' } });
    }) as typeof fetch;
    const viaCdn = (await serveGuideVideo(new Request(`https://bugunbor.uz${guideVideo(PROMO.slug)}`, { headers: { range: 'bytes=0-1' } }), undefined, fromCdn))!;
    expect([viaCdn.status, viaCdn.headers.get('content-length')]).toEqual([206, '2']);
    expect(cdn).toEqual([`${GUIDE_SOURCE}/qollanma/nima-uchun-bugunbor.mp4`]);
    expect(GUIDE_SOURCE).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/davlatsudekspert\/BugunBor@[0-9a-f]{7,40}\/public$/);
    const down = (async () => new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } })) as typeof fetch;
    const plain = (await serveGuideVideo(new Request(`https://bugunbor.uz${guideVideo(PROMO.slug)}`), undefined, down))!;
    expect([plain.status, plain.headers.get('location')]).toEqual([302, 'https://bugunbor.uz/qollanma/nima-uchun-bugunbor.mp4']);
  });
});

