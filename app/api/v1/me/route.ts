import { z } from 'zod';

import { getDb } from '@/db/client';
import { isSecureRequest } from '@/lib/cookies';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { deleteAccount, updateDisplayName, updateNotificationSettings } from '@/modules/auth/account';
import { apiUser } from '@/modules/auth/current';
import { clearSessionCookie } from '@/modules/auth/sessions';

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  notifyDeals: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
});

export const PATCH = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, patchSchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  if (body.displayName !== undefined) await updateDisplayName(db, user.id, body.displayName);
  if (body.notifyDeals !== undefined || body.notifyReminders !== undefined) {
    await updateNotificationSettings(db, user.id, { notifyDeals: body.notifyDeals, notifyReminders: body.notifyReminders });
  }
  return json({ data: { ok: true } });
});

export const DELETE = route(async (request: Request) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  await deleteAccount(db, user.id);
  return json({ data: { deleted: true } }, { headers: { 'set-cookie': clearSessionCookie(isSecureRequest(request)) } });
});
