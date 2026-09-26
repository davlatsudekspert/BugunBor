import { z } from 'zod';

import { getDb } from '@/db/client';
import { assertSameOrigin, json, readJson, requestClient, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { registerDevice, removeDevice } from '@/modules/notifications/devices';

const token = z.string().trim().min(20).max(4096);

// The app registers its Firebase push token after sign-in and removes it on sign-out.
export const PUT = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, z.object({ token, platform: z.enum(['android', 'ios']), locale: z.enum(['uz', 'ru', 'en']).optional() }));
  const db = await getDb();
  const user = await apiUser(request, db);
  await registerDevice(db, { userId: user.id, token: body.token, platform: body.platform, locale: body.locale ?? null, appBuild: requestClient(request).build });
  return json({ data: { ok: true } });
});

export const DELETE = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, z.object({ token }));
  const db = await getDb();
  const user = await apiUser(request, db);
  await removeDevice(db, { userId: user.id, token: body.token });
  return json({ data: { ok: true } });
});
