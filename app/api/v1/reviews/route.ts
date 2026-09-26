import { z } from 'zod';

import { getDb } from '@/db/client';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { REVIEW_RULES, createReview } from '@/modules/engagement/reviews';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';

const reviewSchema = z.object({
  redemptionId: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(REVIEW_RULES.maxComment).nullable().optional(),
});

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, reviewSchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  await enforceRateLimit(db, `write:${user.id}`, RATE_RULES.write);
  return json({ data: await createReview(db, { userId: user.id, redemptionId: body.redemptionId, rating: body.rating, comment: body.comment ?? null }) }, { status: 201 });
});
