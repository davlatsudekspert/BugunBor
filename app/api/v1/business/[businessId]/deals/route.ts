import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { requireMembership } from '@/modules/businesses/access';
import { listBusinessDeals } from '@/modules/deals/service';

// The app's list of a business's deals, newest work first (in review, live,
// paused, drafts, rejected, then ended). Changes go through POST
// /api/v1/business/{id} like on the site.
export const GET = route(async (request: Request, context: { params: Promise<{ businessId: string }> }) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  const { businessId } = await context.params;
  await requireMembership(db, user.id, businessId, 'deal.write');
  const deals = await listBusinessDeals(db, businessId);
  // The automatic check's notes are for moderators only.
  return json({ data: deals.map(({ autoNote: _note, categorySlug: _slug, viewCount, ...deal }) => ({ ...deal, views: viewCount })) });
});
