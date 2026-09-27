import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { givenRatings, reviewableRedemptions } from '@/modules/engagement/reviews';
import { listCustomerRedemptions } from '@/modules/redemptions/service';
import { canReportCode, codeIssuesOf } from '@/modules/reports';

// "My codes": active codes (with the code itself) and history, which visits
// can still be rated, and complaints about a code ("the deal was not honoured").
export const GET = route(async (request: Request) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  const [items, reviewable, ratings, issues] = await Promise.all([
    listCustomerRedemptions(db, user.id, getConfig().hashSecret),
    reviewableRedemptions(db, user.id),
    givenRatings(db, user.id),
    codeIssuesOf(db, user.id),
  ]);
  return json({
    data: items.map((item) => ({
      ...item,
      canRate: reviewable.has(item.id),
      myRating: ratings.get(item.id) ?? null,
      issue: issues.get(item.id) ?? null,
      canReportIssue: !issues.has(item.id) && canReportCode(item.createdAt),
    })),
  });
});
