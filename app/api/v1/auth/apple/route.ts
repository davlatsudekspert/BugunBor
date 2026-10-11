import { z } from 'zod';

import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { clientIp, json, readJson, requestClient, requestLocale, route } from '@/lib/http';
import { PRIVACY_VERSION } from '@/lib/privacy';
import { exchangeAppleCode, sealRefreshToken, upsertAppleUser, verifyAppleIdentityToken } from '@/modules/auth/apple';
import { createSession } from '@/modules/auth/sessions';
import { DomainError } from '@/modules/errors';
import { RATE_RULES, enforceRateLimit, hashIp } from '@/modules/rate-limit';

// POST /api/v1/auth/apple — Sign in with Apple from the iOS app. The name
// comes from the app (Apple shares it only on the first sign-in); consent is
// the login screen's required privacy box, as for Telegram.
const bodySchema = z.object({
  identityToken: z.string().min(20).max(5000),
  authorizationCode: z.string().max(500).nullish(),
  givenName: z.string().max(80).nullish(),
  familyName: z.string().max(80).nullish(),
  consent: z.boolean().optional(),
});

export const POST = route(async (request: Request) => {
  const body = await readJson(request, bodySchema);
  if (body.consent !== true) throw new DomainError('CONSENT_REQUIRED');
  const config = getConfig();
  const db = await getDb();
  const ipHash = await hashIp(clientIp(request), config.hashSecret);
  await enforceRateLimit(db, `login-start:${ipHash}`, RATE_RULES.loginStart);

  const { sub } = await verifyAppleIdentityToken(body.identityToken);
  const name = [body.givenName, body.familyName].filter(Boolean).join(' ') || null;
  const user = await upsertAppleUser(db, { sub, displayName: name, locale: requestLocale(request), privacyVersion: PRIVACY_VERSION });

  if (body.authorizationCode && config.app.appleKey) {
    const refreshToken = await exchangeAppleCode(body.authorizationCode, config.app.appleKey).catch(() => null);
    if (refreshToken) {
      await db.prepare(`UPDATE users SET apple_refresh_token = ?2 WHERE id = ?1`).bind(user.id, await sealRefreshToken(refreshToken, user.id, config.hashSecret)).run();
    }
  }

  const { build } = requestClient(request);
  const session = await createSession(db, user.id, { userAgent: request.headers.get('user-agent'), ipHash, client: 'app', appBuild: build });
  return json({ data: { token: session.token, expiresAt: session.expiresAt.toISOString() } });
});
