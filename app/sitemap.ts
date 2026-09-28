import type { MetadataRoute } from 'next';

import { getDb } from '@/db/client';
import { isCitySlug } from '@/lib/cities';
import { getConfig } from '@/lib/env';
import { localeAlternates, localizedHref } from '@/lib/locale-paths';
import { PRIVACY_LANGUAGES } from '@/lib/privacy';
import { toDbTime } from '@/lib/time';
import { PUBLIC_BUSINESS_SQL, liveDealSql } from '@/modules/deals/status';

type Entry = MetadataRoute.Sitemap[number];

// Every page is listed in Uzbek (the plain address) and in Russian (/ru/…);
// each lists the other as its language version, Uzbek being the default.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = getConfig().appUrl ?? 'https://bugunbor.uz';
  const absolute = (languages: Record<string, string>) => Object.fromEntries(Object.entries(languages).map(([language, href]) => [language, `${BASE}${href}`]));
  const both = (path: string, entry: Omit<Entry, 'url'>): Entry[] => {
    const alternates = { languages: absolute(localeAlternates(path, 'uz').languages) };
    return [path, localizedHref(path, 'ru')].map((href) => ({ ...entry, url: `${BASE}${href}`, alternates }));
  };
  const privacy = { languages: absolute({ ...PRIVACY_LANGUAGES, 'x-default': PRIVACY_LANGUAGES.uz }) };
  const staticPages: MetadataRoute.Sitemap = [
    ...['/', '/discover', '/categories', '/business', '/how-it-works', '/faq', '/ilova', '/qollanma', '/contact', '/terms', '/oferta'].flatMap((path) =>
      both(path, { changeFrequency: path === '/' || path === '/discover' ? 'hourly' : 'weekly', priority: path === '/' ? 1 : 0.6 })),
    ...Object.values(PRIVACY_LANGUAGES).map((href) => ({ url: `${BASE}${href}`, changeFrequency: 'weekly' as const, priority: 0.6, alternates: privacy })),
  ];
  try {
    const db = await getDb();
    const now = toDbTime(new Date());
    const [categories, deals, businesses, cities] = await Promise.all([
      db.prepare(`SELECT slug FROM categories WHERE is_active = 1`).all<{ slug: string }>(),
      // Sample (demo) businesses and deals are made up: search engines never get them.
      db.prepare(`SELECT d.slug, d.updated_at AS updatedAt FROM deals d JOIN businesses b ON b.id = d.business_id WHERE ${liveDealSql('?1')} AND d.is_demo = 0 AND b.is_demo = 0 LIMIT 5000`).bind(now).all<{ slug: string; updatedAt: string }>(),
      db.prepare(`SELECT b.slug, b.updated_at AS updatedAt FROM businesses b WHERE ${PUBLIC_BUSINESS_SQL} AND b.is_demo = 0 LIMIT 5000`).all<{ slug: string; updatedAt: string }>(),
      // A city's page once it has a real deal: an empty one tells a searcher nothing.
      db.prepare(`SELECT DISTINCT br.city FROM deals d JOIN businesses b ON b.id = d.business_id
        JOIN deal_branches db ON db.deal_id = d.id JOIN branches br ON br.id = db.branch_id AND br.deleted_at IS NULL
        WHERE ${liveDealSql('?1')} AND d.is_demo = 0 AND b.is_demo = 0`).bind(now).all<{ city: string }>(),
    ]);
    return [
      ...staticPages,
      ...categories.results.flatMap((row) => both(`/categories/${row.slug}`, { changeFrequency: 'daily', priority: 0.7 })),
      ...cities.results.filter((row) => isCitySlug(row.city)).flatMap((row) => both(`/discover?city=${row.city}`, { changeFrequency: 'hourly', priority: 0.7 })),
      ...deals.results.flatMap((row) => both(`/deals/${row.slug}`, { changeFrequency: 'hourly', priority: 0.8 })),
      ...businesses.results.flatMap((row) => both(`/businesses/${row.slug}`, { changeFrequency: 'daily', priority: 0.5 })),
    ];
  } catch {
    return staticPages;
  }
}
