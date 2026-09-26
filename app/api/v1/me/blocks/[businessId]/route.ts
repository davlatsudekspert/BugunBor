import { getDb } from '@/db/client';
import { assertSameOrigin, json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { blockBusiness, unblockBusiness } from '@/modules/engagement/blocks';

type Context = { params: Promise<{ businessId: string }> };

export const PUT = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const { businessId } = await context.params;
  const db = await getDb();
  const user = await apiUser(request, db);
  await blockBusiness(db, { userId: user.id, businessId });
  return json({ data: { blocked: true } });
});

export const DELETE = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const { businessId } = await context.params;
  const db = await getDb();
  const user = await apiUser(request, db);
  await unblockBusiness(db, { userId: user.id, businessId });
  return json({ data: { blocked: false } });
});
