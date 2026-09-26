import { getDb } from '@/db/client';
import { isSecureRequest, readCookie, serializeCookie } from '@/lib/cookies';
import { getConfig } from '@/lib/env';
import { clientIp, json, requestClient, route } from '@/lib/http';
import { LOGIN_COOKIE, pollLogin } from '@/modules/auth/login';
import { createSession, sessionCookie } from '@/modules/auth/sessions';
import { RATE_RULES, enforceRateLimit, hashIp } from '@/modules/rate-limit';

// The site polls with the bb_login cookie and receives the session as a
// cookie; the mobile app polls with the secret in `x-login-secret` and
// receives the session token in the body (it keeps it in secure storage).
export const GET = route(async (request) => {
  const db = await getDb();
  const ipHash = await hashIp(clientIp(request), getConfig().hashSecret);
  await enforceRateLimit(db, `login-poll:${ipHash}`, RATE_RULES.loginPoll);

  const appSecret = request.headers.get('x-login-secret');
  const result = await pollLogin(db, appSecret ?? readCookie(request, LOGIN_COOKIE));
  if (result.status !== 'APPROVED') {
    return json({ data: { status: result.status } });
  }

  const { client, build } = requestClient(request);
  const session = await createSession(db, result.userId, { userAgent: request.headers.get('user-agent'), ipHash, client: appSecret ? 'app' : client, appBuild: build });
  if (appSecret) {
    return json({ data: { status: 'APPROVED', token: session.token, expiresAt: session.expiresAt.toISOString() } });
  }
  const secure = isSecureRequest(request);
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', sessionCookie(session.token, secure));
  headers.append('set-cookie', serializeCookie(LOGIN_COOKIE, '', { maxAge: 0, secure }));
  return Response.json({ data: { status: 'APPROVED', returnTo: result.returnTo } }, { headers });
});
