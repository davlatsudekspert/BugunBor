import { getDb } from '@/db/client';
import { assertSameOrigin, json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { cancelRedemption } from '@/modules/redemptions/service';

export const POST = route(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  const { id } = await context.params;
  await cancelRedemption(db, { redemptionId: id, userId: user.id });
  return json({ data: { status: 'CANCELED' } });
});
