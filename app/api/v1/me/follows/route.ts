import { getDb } from '@/db/client';
import { json, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { demoEnabled } from '@/modules/demo';
import { listFollowedBusinesses } from '@/modules/engagement/follows';

export const GET = route(async (request: Request) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  return json({ data: await listFollowedBusinesses(db, user.id, { demo: await demoEnabled(db) }) });
});
