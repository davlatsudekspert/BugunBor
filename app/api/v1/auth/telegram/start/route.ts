import { z } from 'zod';

import { getDb } from '@/db/client';
import { isSecureRequest, serializeCookie } from '@/lib/cookies';
import { getConfig, isTelegramConfigured } from '@/lib/env';
import { assertSameOrigin, clientIp, json, readJson, requestLocale, route } from '@/lib/http';
import { LOGIN_COOKIE, LOGIN_TTL_MINUTES, loginCookieValue, startLogin } from '@/modules/auth/login';
import { DomainError } from '@/modules/errors';
import { RATE_RULES, enforceRateLimit, hashIp } from '@/modules/rate-limit';

const bodySchema = z.object({ returnTo: z.string().max(500).optional() });

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const config = getConfig();
  if (!isTelegramConfigured(config)) throw new DomainError('TELEGRAM_NOT_CONFIGURED');
  const body = await readJson(request, bodySchema);
  const db = await getDb();
  const ipHash = await hashIp(clientIp(request), config.hashSecret);
  await enforceRateLimit(db, `login-start:${ipHash}`, RATE_RULES.loginStart);

  const login = await startLogin(db, {
    returnTo: body.returnTo,
    locale: requestLocale(request),
    userAgent: request.headers.get('user-agent'),
    ipHash,
  });

  const cookie = serializeCookie(LOGIN_COOKIE, loginCookieValue(login.id, login.browserSecret), {
    maxAge: LOGIN_TTL_MINUTES * 60,
    secure: isSecureRequest(request),
  });
  return json(
    {
      data: {
        matchCode: login.matchCode,
        expiresAt: login.expiresAt.toISOString(),
        deepLink: `https://t.me/${config.telegram.botUsername}?start=${login.token}`,
      },
    },
    { status: 201, headers: { 'set-cookie': cookie } },
  );
});
