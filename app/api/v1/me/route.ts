import { z } from 'zod';

import { getDb } from '@/db/client';
import { isSecureRequest } from '@/lib/cookies';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { deleteAccount, updateDisplayName } from '@/modules/auth/account';
import { apiUser } from '@/modules/auth/current';
import { clearSessionCookie } from '@/modules/auth/sessions';

const patchSchema = z.object({ displayName: z.string().trim().min(2).max(60) });

export const PATCH = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, patchSchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  await updateDisplayName(db, user.id, body.displayName);
  return json({ data: { displayName: body.displayName } });
});

export const DELETE = route(async (request: Request) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  await deleteAccount(db, user.id);
  return json({ data: { deleted: true } }, { headers: { 'set-cookie': clearSessionCookie(isSecureRequest(request)) } });
});
