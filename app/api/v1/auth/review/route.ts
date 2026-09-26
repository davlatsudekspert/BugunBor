import { z } from 'zod';

import { getDb } from '@/db/client';
import { sha256Hex } from '@/lib/crypto';
import { getConfig } from '@/lib/env';
import { clientIp, json, readJson, requestClient, route } from '@/lib/http';
import { PRIVACY_VERSION } from '@/lib/privacy';
import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { createSession } from '@/modules/auth/sessions';
import { DomainError } from '@/modules/errors';
import { RATE_RULES, enforceRateLimit, hashIp } from '@/modules/rate-limit';

// Store reviewers cannot sign in with Telegram, so they get a dedicated test
// account behind a code kept only in the REVIEW_LOGIN_CODE secret. Unset
// secret = this endpoint does not exist. Every sign-in is written to the audit log.
const REVIEW_USER_ID = 'usr_review';

export const POST = route(async (request: Request) => {
  const config = getConfig();
  if (!config.app.reviewLoginCode) throw new DomainError('NOT_FOUND');
  const db = await getDb();
  const ipHash = await hashIp(clientIp(request), config.hashSecret);
  await enforceRateLimit(db, `review-login:${ipHash}`, RATE_RULES.loginStart);
  const body = await readJson(request, z.object({ code: z.string().max(200) }));
  // Compare hashes so the check takes the same time whatever the input.
  if ((await sha256Hex(body.code)) !== (await sha256Hex(config.app.reviewLoginCode))) throw new DomainError('FORBIDDEN');
  const nowDb = toDbTime(new Date());
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO users(id, role, display_name, locale, status, privacy_accepted_at, privacy_version, created_at, updated_at)
      VALUES (?1, 'CUSTOMER', 'Store Review', 'uz', 'ACTIVE', ?2, ?3, ?2, ?2)`).bind(REVIEW_USER_ID, nowDb, PRIVACY_VERSION),
    auditStatement(db, { actorUserId: REVIEW_USER_ID, action: 'user.review_login', targetType: 'User', targetId: REVIEW_USER_ID }, nowDb),
  ]);
  const { build } = requestClient(request);
  const session = await createSession(db, REVIEW_USER_ID, { userAgent: request.headers.get('user-agent'), ipHash, client: 'app', appBuild: build });
  return json({ data: { token: session.token, expiresAt: session.expiresAt.toISOString() } });
});
