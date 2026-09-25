import { getDb } from '@/db/client';
import { assertSameOrigin, json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/current';
import { followBusiness, followState, unfollowBusiness } from '@/modules/engagement/follows';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';

type Context = { params: Promise<{ businessId: string }> };

export const PUT = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  await enforceRateLimit(db, `write:${user.id}`, RATE_RULES.write);
  const { businessId } = await context.params;
  await followBusiness(db, { userId: user.id, businessId });
  return json({ data: await followState(db, businessId, user.id) });
});

export const DELETE = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  const { businessId } = await context.params;
  await unfollowBusiness(db, { userId: user.id, businessId });
  return json({ data: await followState(db, businessId, user.id) });
});
