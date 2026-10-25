import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { adminOverview, appUsage, growthStats } from '@/modules/admin/service';
import { appOwner } from '@/modules/auth/app-owner';

// GET /api/v1/admin/overview — the owner's numbers for the app's Profile tab.
// Only aggregate counts (nobody's name or phone).
export const GET = route(async (request: Request) => {
  const db = await getDb();
  await appOwner(request, db);
  const [queue, app, growth] = await Promise.all([adminOverview(db), appUsage(db), growthStats(db)]);
  return json({
    data: {
      queue: { businesses: queue.pendingBusinesses, deals: queue.pendingDeals, messages: queue.newMessages, reports: app.openReports, payments: queue.pendingPayments },
      today: { claims: queue.claimsToday, redeemed: queue.redeemedToday, liveDeals: queue.liveDeals },
      users: { total: queue.users, new7: growth.newUsers7, new30: growth.newUsers30, signedIn: growth.signedIn, app30: app.activeUsers, devices: app.devices },
      objects: growth.objects,
      days: growth.days,
      latestBuild: app.latestBuild,
    },
  });
});
