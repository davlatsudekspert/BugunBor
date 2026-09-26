import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { mediaUrl } from '@/lib/photos';
import { dateToTashkentInput, parseDbTime } from '@/lib/time';
import { apiUser } from '@/modules/auth/api-user';
import { requireMembership } from '@/modules/businesses/access';
import { getBusinessDeal } from '@/modules/deals/service';

// One deal as the app's edit form needs it: times in the same Tashkent
// `YYYY-MM-DDTHH:MM` form the form sends back with deal.update.
export const GET = route(async (request: Request, context: { params: Promise<{ businessId: string; dealId: string }> }) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  const { businessId, dealId } = await context.params;
  await requireMembership(db, user.id, businessId, 'deal.write');
  const deal = await getBusinessDeal(db, businessId, dealId);
  return json({
    data: {
      ...deal,
      startsAt: dateToTashkentInput(parseDbTime(deal.startsAt)),
      endsAt: dateToTashkentInput(parseDbTime(deal.endsAt)),
      photo: mediaUrl(deal.photoId),
    },
  });
});
