import { z } from 'zod';

import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { assertSameOrigin, clientIp, json, readJson, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { adminSessionVerified, assertAdminOwner, beginAdminSetup, factorEnabled, verifyAdminFactor, verifyAdminRecovery } from '@/modules/auth/admin-mfa';
import { hashIp } from '@/modules/rate-limit';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setup') }),
  z.object({ action: z.literal('verify'), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal('recovery'), code: z.string().regex(/^[A-Za-z0-9_-]{24}$/) }),
]);

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  assertAdminOwner(user);
  const body = await readJson(request, schema);
  const config = getConfig();
  const ipHash = await hashIp(clientIp(request), config.hashSecret);
  // Legacy enrollments keep their HASH_SECRET fallback; a separate key leaves
  // customer redemption hashes unchanged.
  const encryptionSecret = config.adminMfaSecret ?? config.hashSecret;
  if (body.action === 'setup') return json({ data: await beginAdminSetup(db, user, encryptionSecret, ipHash) });
  if (body.action === 'verify') return json({ data: await verifyAdminFactor(db, user, body.code, encryptionSecret, ipHash) });
  await verifyAdminRecovery(db, user, body.code, ipHash);
  return json({ data: { recoveryCodes: [] } });
});

export const GET = route(async (request: Request) => {
  const db = await getDb();
  const user = await apiUser(request, db);
  assertAdminOwner(user);
  return json({ data: { enabled: await factorEnabled(db, user.id), verified: await adminSessionVerified(db, user) } });
});
