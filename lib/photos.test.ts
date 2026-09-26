import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildDemoCatalog } from '@/db/demo-catalog';
import { dealPhotoUrl, photoSrcSet } from './photos';
import { STOCK_PHOTOS } from './stock-photos';
import { isDealVisual } from './visuals';

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));

describe('stock photos', () => {
  const entries = Object.entries(STOCK_PHOTOS);

  it('are real files in two sizes, keyed by a known visual', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, photo] of entries) {
      expect(isDealVisual(key.replace(/-\d+$/, '')), key).toBe(true);
      expect(photo.src, key).toBe(`/photos/${key}.webp`);
      expect(existsSync(join(PUBLIC, photo.src)), photo.src).toBe(true);
      expect(existsSync(join(PUBLIC, photo.src.replace(/\.webp$/, '.sm.webp'))), key).toBe(true);
    }
  });

  it('carry an author and a licence that allows commercial use', () => {
    for (const [key, photo] of entries) {
      expect(photo.author.length, key).toBeGreaterThan(0);
      expect(photo.author.length, key).toBeLessThanOrEqual(60);
      expect(photo.license, key).toMatch(/^(CC0|Public domain|CC BY(-SA)? [2-4]\.[05]|Unsplash License|Pexels License|Own photo)/i);
      expect(photo.license, key).not.toMatch(/\b(NC|ND)\b/);
    }
  });

  it('cover every visual used by the demo catalogue', () => {
    const visuals = new Set(buildDemoCatalog(new Date('2026-09-26T06:00:00Z')).deals.map((deal) => deal.visual));
    for (const visual of visuals) expect(dealPhotoUrl({ isDemo: true, visual, slug: 'x' }), visual).not.toBeNull();
  });
});

describe('dealPhotoUrl', () => {
  it('prefers the uploaded photo and shows stock photos on demo deals only', () => {
    expect(dealPhotoUrl({ photoId: 'abc', isDemo: true, visual: 'plov' })).toBe('/media/abc');
    expect(dealPhotoUrl({ isDemo: false, visual: 'plov', slug: 'osh' })).toBeNull();
    expect(dealPhotoUrl({ isDemo: 1, visual: 'no-such-visual', slug: 'osh' })).toBeNull();
    expect(dealPhotoUrl({ isDemo: 1, visual: 'plov', slug: 'osh' })).toMatch(/^\/photos\/plov(-\d+)?\.webp$/);
  });

  it('keeps one photo per deal and spreads the variants over deals', () => {
    const slug = 'samarqand-oshi-samarkand';
    expect(dealPhotoUrl({ isDemo: 1, visual: 'plov', slug })).toBe(dealPhotoUrl({ isDemo: 1, visual: 'plov', slug }));
    const variants = Object.keys(STOCK_PHOTOS).filter((key) => key.replace(/-\d+$/, '') === 'plov').length;
    const used = new Set(Array.from({ length: 40 }, (_, index) => dealPhotoUrl({ isDemo: 1, visual: 'plov', slug: `osh-${index}` })));
    expect(used.size).toBe(variants);
  });
});

describe('photoSrcSet', () => {
  it('offers the small file for stock photos only', () => {
    expect(photoSrcSet('/photos/plov.webp')).toBe('/photos/plov.sm.webp 720w, /photos/plov.webp 1200w');
    expect(photoSrcSet('/media/abc')).toBeUndefined();
  });
});
