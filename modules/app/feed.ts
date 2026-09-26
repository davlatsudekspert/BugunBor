import { DEFAULT_CITY, nearestCity } from '@/lib/cities';
import { listLiveDeals, type DealCard } from '@/modules/catalog/queries';

// The app's home screen: "For you" (the customer's interests), "Near you"
// (by distance when the phone shares its location, otherwise the chosen
// city) and "Ending soon". Blocked businesses never appear.

export const FEED_LIMITS = { forYou: 12, nearby: 20, ending: 12, radiusKm: 30 } as const;

type Point = { latitude: number; longitude: number };
export type Feed = { city: string; located: boolean; forYou: DealCard[]; nearby: DealCard[]; ending: DealCard[]; total: number };

export async function buildFeed(
  db: D1Database,
  input: { near: Point | null; city: string | null; interests: string[]; blocked: string[]; demo: boolean; now?: Date },
): Promise<Feed> {
  const near = input.near;
  const city = near ? nearestCity(near).slug : (input.city ?? DEFAULT_CITY);
  const blocked = new Set(input.blocked);
  const deals = (await listLiveDeals(db, { city: near ? null : city, near, sort: near ? 'near' : 'ending', demo: input.demo, now: input.now }))
    .filter((deal) => deal.effective === 'LIVE' && !blocked.has(deal.business.id));
  // With a location: what is within reach, or simply the closest ones in a small town.
  const local = near ? deals.filter((deal) => (deal.distanceKm ?? Infinity) <= FEED_LIMITS.radiusKm) : deals;
  const pool = local.length ? local : deals;
  const interests = new Set(input.interests);
  const byEnding = (a: DealCard, b: DealCard) => a.endsAt.localeCompare(b.endsAt);
  return {
    city,
    located: Boolean(near),
    forYou: pool.filter((deal) => interests.has(deal.categorySlug)).slice(0, FEED_LIMITS.forYou),
    nearby: pool.slice(0, FEED_LIMITS.nearby),
    ending: [...pool].sort(byEnding).slice(0, FEED_LIMITS.ending),
    total: pool.length,
  };
}

/**
 * Remembers a rough notification area (~1 km grid) for "new deal near you",
 * only for people who switched that alert on, and only when it changed.
 */
export async function rememberNotifyArea(db: D1Database, userId: string, near: Point, nowDb: string) {
  const lat = Math.round(near.latitude * 100);
  const lng = Math.round(near.longitude * 100);
  await db
    .prepare(`UPDATE users SET notify_lat_e2 = ?2, notify_lng_e2 = ?3, notify_city = ?4, notify_area_at = ?5
      WHERE id = ?1 AND notify_nearby = 1 AND (notify_lat_e2 IS NOT ?2 OR notify_lng_e2 IS NOT ?3)`)
    .bind(userId, lat, lng, nearestCity(near).slug, nowDb)
    .run();
}
