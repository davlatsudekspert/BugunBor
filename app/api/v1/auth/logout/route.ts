import { getDb } from '@/db/client';
import { isSecureRequest } from '@/lib/cookies';
import { assertSameOrigin, json, route } from '@/lib/http';
import { requestSessionToken } from '@/modules/auth/api-user';
import { clearSessionCookie, revokeSessionByToken } from '@/modules/auth/sessions';

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const token = requestSessionToken(request);
  if (token) await revokeSessionByToken(await getDb(), token);
  return json({ data: { ok: true } }, { headers: { 'set-cookie': clearSessionCookie(isSecureRequest(request)) } });
});
