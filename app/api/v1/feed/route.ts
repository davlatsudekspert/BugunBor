import { z } from 'zod';

import { getDb } from '@/db/client';
import { CITY_SLUGS } from '@/lib/cities';
import { json, route, ValidationError } from '@/lib/http';
import { toDbTime } from '@/lib/time';
import { buildFeed, rememberNotifyArea } from '@/modules/app/feed';
import { optionalApiUser } from '@/modules/auth/api-user';
import { listBlockedBusinessIds } from '@/modules/engagement/blocks';
import { getInterests } from '@/modules/engagement/interests';
import { demoEnabled } from '@/modules/demo';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  city: z.enum(CITY_SLUGS).optional(),
  // Guests keep their interests on the phone until they sign in.
  interests: z.string().max(400).optional(),
});

export const GET = route(async (request: Request) => {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) throw new ValidationError(parsed.error);
  const { lat, lng, city, interests } = parsed.data;
  // Rounded to ~100 m before it is used; it is not stored (see rememberNotifyArea).
  const near = lat !== undefined && lng !== undefined ? { latitude: Math.round(lat * 1000) / 1000, longitude: Math.round(lng * 1000) / 1000 } : null;
  const db = await getDb();
  const user = await optionalApiUser(request, db);
  const [demo, savedInterests, blocked] = await Promise.all([
    demoEnabled(db),
    user ? getInterests(db, user.id) : Promise.resolve((interests ?? '').split(',').map((slug) => slug.trim()).filter(Boolean).slice(0, 20)),
    user ? listBlockedBusinessIds(db, user.id) : Promise.resolve([]),
  ]);
  const feed = await buildFeed(db, { near, city: city ?? null, interests: savedInterests, blocked, demo });
  if (user && near) await rememberNotifyArea(db, user.id, near, toDbTime(new Date()));
  return json({ data: feed });
});
