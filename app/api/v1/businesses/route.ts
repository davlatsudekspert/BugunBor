import { getDb } from '@/db/client';
import { assertSameOrigin, json, readJson, requestLocale, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/current';
import { onboardingSchema } from '@/modules/businesses/schema';
import { createBusiness } from '@/modules/businesses/service';
import { autoModerateBusiness } from '@/modules/moderation/auto';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const data = await readJson(request, onboardingSchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  await enforceRateLimit(db, `write:${user.id}`, RATE_RULES.write);
  const business = await createBusiness(db, { userId: user.id, data, locale: requestLocale(request) });
  // A clean application is approved on the spot; anything else waits for a moderator.
  const checked = await autoModerateBusiness(db, business.id);
  return json({ data: { ...business, status: checked?.status ?? 'PENDING' } }, { status: 201 });
});
