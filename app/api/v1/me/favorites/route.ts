import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { listFavoriteDeals } from '@/modules/catalog/queries';
import { demoEnabled } from '@/modules/demo';

export const GET = route(async (request: Request) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  return json({ data: await listFavoriteDeals(db, user.id, { demo: await demoEnabled(db) }) });
});
