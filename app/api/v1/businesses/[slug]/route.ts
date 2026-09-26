import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { optionalApiUser } from '@/modules/auth/api-user';
import { getPublicBusiness } from '@/modules/catalog/queries';
import { demoEnabled } from '@/modules/demo';
import { followState } from '@/modules/engagement/follows';
import { listBusinessReviews } from '@/modules/engagement/reviews';
import { DomainError } from '@/modules/errors';

// A public business page: profile, branches, live and upcoming deals, reviews.
export const GET = route(async (request: Request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const db = await getDb();
  const [user, demo] = await Promise.all([optionalApiUser(request, db), demoEnabled(db)]);
  const business = await getPublicBusiness(db, slug, { demo });
  if (!business) throw new DomainError('NOT_FOUND');
  const [reviews, follow] = await Promise.all([listBusinessReviews(db, business.id, 20), followState(db, business.id, user?.id ?? null)]);
  return json({ data: { ...business, reviews, following: follow.following, followers: follow.followers } });
});
