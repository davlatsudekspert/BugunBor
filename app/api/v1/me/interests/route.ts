import { z } from 'zod';

import { getDb } from '@/db/client';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { MAX_INTERESTS, setInterests } from '@/modules/engagement/interests';

const bodySchema = z.object({ categories: z.array(z.string().trim().min(1).max(40)).max(MAX_INTERESTS) });

export const PUT = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, bodySchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  return json({ data: { interests: await setInterests(db, user.id, body.categories) } });
});
