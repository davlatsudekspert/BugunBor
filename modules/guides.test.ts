import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/ru';
import { uz } from '@/lib/i18n/uz';
import { GUIDES, GUIDES_PAGE, PROMO, clock, guideCaptions, guidePoster, guideVideo, isoDuration } from './guides';

const publicDir = path.resolve(__dirname, '../public');

describe('video guides', () => {
  it('has every video and poster it lists, and nothing else', () => {
    const listed = [PROMO, ...GUIDES].flatMap((guide) => [guideVideo(guide.slug), guidePoster(guide.slug), guideCaptions(guide.slug)]);
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
});
