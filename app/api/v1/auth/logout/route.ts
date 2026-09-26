import { getDb } from '@/db/client';
import { isSecureRequest, readCookie } from '@/lib/cookies';
import { assertSameOrigin, json, route } from '@/lib/http';
import { SESSION_COOKIE, clearSessionCookie, revokeSessionByToken } from '@/modules/auth/sessions';

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await revokeSessionByToken(await getDb(), token);
  return json({ data: { ok: true } }, { headers: { 'set-cookie': clearSessionCookie(isSecureRequest(request)) } });
});
