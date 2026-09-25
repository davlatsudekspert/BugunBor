import { z } from 'zod';

import { getDb } from '@/db/client';
import { DEMO_USERS } from '@/db/seed';
import { isSecureRequest } from '@/lib/cookies';
import { assertSameOrigin, json, readJson, route, safeReturnPath } from '@/lib/http';
import { createSession, sessionCookie } from '@/modules/auth/sessions';
import { DomainError } from '@/modules/errors';

const bodySchema = z.object({
  userId: z.enum(DEMO_USERS.map((user) => user.id) as [string, ...string[]]),
  returnTo: z.string().max(500).optional(),
});

// Development-only shortcut to sign in as a demo user. `import.meta.env.DEV`
// is statically false in production builds, so this route always 404s there.
export const POST = route(async (request) => {
  if (!import.meta.env.DEV) throw new DomainError('NOT_FOUND');
  assertSameOrigin(request);
  const body = await readJson(request, bodySchema);
  const db = await getDb();
  const session = await createSession(db, body.userId, { userAgent: request.headers.get('user-agent') });
  return json(
    { data: { status: 'APPROVED', returnTo: safeReturnPath(body.returnTo, '/account') } },
    { headers: { 'set-cookie': sessionCookie(session.token, isSecureRequest(request)) } },
  );
});
