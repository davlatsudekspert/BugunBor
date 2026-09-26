import { z } from 'zod';

import { getDb } from '@/db/client';
import { isSecureRequest, serializeCookie } from '@/lib/cookies';
import { getConfig, isTelegramConfigured } from '@/lib/env';
import { assertSameOrigin, clientIp, json, readJson, requestLocale, route } from '@/lib/http';
import { LOGIN_COOKIE, LOGIN_TTL_MINUTES, loginCookieValue, startLogin } from '@/modules/auth/login';
import { DomainError } from '@/modules/errors';
import { loginBotUsername } from '@/modules/telegram/setup';
import { RATE_RULES, enforceRateLimit, hashIp } from '@/modules/rate-limit';

// `consent` is the login page's required "I agree to the privacy policy and terms" box.
// `client: 'app'` (the mobile app) gets the login secret in the body instead of a cookie.
const bodySchema = z.object({ returnTo: z.string().max(500).optional(), consent: z.boolean().optional(), client: z.enum(['web', 'app']).optional() });

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const config = getConfig();
  if (!isTelegramConfigured(config)) throw new DomainError('TELEGRAM_NOT_CONFIGURED');
  const body = await readJson(request, bodySchema);
  if (body.consent !== true) throw new DomainError('CONSENT_REQUIRED');
  const db = await getDb();
  const ipHash = await hashIp(clientIp(request), config.hashSecret);
  await enforceRateLimit(db, `login-start:${ipHash}`, RATE_RULES.loginStart);

  const login = await startLogin(db, {
    returnTo: body.returnTo,
    locale: requestLocale(request),
    userAgent: request.headers.get('user-agent'),
    ipHash,
    consent: true,
    client: body.client ?? 'web',
  });
  const deepLink = `https://t.me/${await loginBotUsername(db, config)}?start=${login.token}`;
  if (body.client === 'app') {
    return json({ data: { matchCode: login.matchCode, expiresAt: login.expiresAt.toISOString(), deepLink, loginSecret: loginCookieValue(login.id, login.browserSecret) } }, { status: 201 });
  }

  const cookie = serializeCookie(LOGIN_COOKIE, loginCookieValue(login.id, login.browserSecret), {
    maxAge: LOGIN_TTL_MINUTES * 60,
    secure: isSecureRequest(request),
  });
  return json(
    {
      data: {
        matchCode: login.matchCode,
        expiresAt: login.expiresAt.toISOString(),
        deepLink,
      },
    },
    { status: 201, headers: { 'set-cookie': cookie } },
  );
});
