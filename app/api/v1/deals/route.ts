import { z } from 'zod';

import { getDb } from '@/db/client';
import { demoEnabled } from '@/modules/demo';
import { CITY_SLUGS } from '@/lib/cities';
import { json, route, ValidationError } from '@/lib/http';
import { SORT_KEYS, listLiveDeals, type SortKey } from '@/modules/catalog/queries';

const querySchema = z.object({
  city: z.enum(CITY_SLUGS).optional(),
  category: z.string().trim().max(40).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(SORT_KEYS as [SortKey, ...SortKey[]]).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  offset: z.coerce.number().int().min(0).max(2000).default(0),
});

// Public catalogue for the mobile apps: live deals only, paginated.
export const GET = route(async (request: Request) => {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) throw new ValidationError(parsed.error);
  const { city, category, q, sort, lat, lng, limit, offset } = parsed.data;
  const near = lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : null;
  const db = await getDb();
  const deals = await listLiveDeals(db, { city: city ?? null, category: category ?? null, query: q, sort, near, demo: await demoEnabled(db) });
  return json(
    { data: deals.slice(offset, offset + limit), page: { total: deals.length, offset, limit } },
    { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=60' } },
  );
});
