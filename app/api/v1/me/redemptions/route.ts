import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { givenRatings, reviewableRedemptions } from '@/modules/engagement/reviews';
import { listCustomerRedemptions } from '@/modules/redemptions/service';

// "My codes": active codes (with the code itself) and history, and which visits can still be rated.
export const GET = route(async (request: Request) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  const [items, reviewable, ratings] = await Promise.all([listCustomerRedemptions(db, user.id, getConfig().hashSecret), reviewableRedemptions(db, user.id), givenRatings(db, user.id)]);
  return json({ data: items.map((item) => ({ ...item, canRate: reviewable.has(item.id), myRating: ratings.get(item.id) ?? null })) });
});
