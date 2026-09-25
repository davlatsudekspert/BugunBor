import type { MetadataRoute } from 'next';

import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { toDbTime } from '@/lib/time';
import { PUBLIC_BUSINESS_SQL, liveDealSql } from '@/modules/deals/status';

const BASE = 'https://bugunbor.uz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = ['/', '/discover', '/categories', '/business', '/how-it-works', '/faq', '/contact', '/terms', '/privacy'].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '/' || path === '/discover' ? 'hourly' : 'weekly',
    priority: path === '/' ? 1 : 0.6,
  }));
  try {
    const db = await getDb();
    const now = toDbTime(new Date());
    const demo = getConfig().demoMode ? 1 : 0;
    const [categories, deals, businesses] = await Promise.all([
      db.prepare(`SELECT slug FROM categories WHERE is_active = 1`).all<{ slug: string }>(),
      db.prepare(`SELECT d.slug, d.updated_at AS updatedAt FROM deals d JOIN businesses b ON b.id = d.business_id WHERE ${liveDealSql('?1')} AND (?2 = 1 OR d.is_demo = 0) LIMIT 5000`).bind(now, demo).all<{ slug: string; updatedAt: string }>(),
      db.prepare(`SELECT b.slug, b.updated_at AS updatedAt FROM businesses b WHERE ${PUBLIC_BUSINESS_SQL} AND (?1 = 1 OR b.is_demo = 0) LIMIT 5000`).bind(demo).all<{ slug: string; updatedAt: string }>(),
    ]);
    return [
      ...staticPages,
      ...categories.results.map((row) => ({ url: `${BASE}/categories/${row.slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
      ...deals.results.map((row) => ({ url: `${BASE}/deals/${row.slug}`, changeFrequency: 'hourly' as const, priority: 0.8 })),
      ...businesses.results.map((row) => ({ url: `${BASE}/businesses/${row.slug}`, changeFrequency: 'daily' as const, priority: 0.5 })),
    ];
  } catch {
    return staticPages;
  }
}
