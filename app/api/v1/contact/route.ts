import { z } from 'zod';

import { getDb } from '@/db/client';
import { readCookie } from '@/lib/cookies';
import { getConfig } from '@/lib/env';
import { assertSameOrigin, clientIp, json, readJson, route } from '@/lib/http';
import { toDbTime } from '@/lib/time';
import { SESSION_COOKIE, getSessionUser } from '@/modules/auth/sessions';
import { RATE_RULES, enforceRateLimit, hashIp } from '@/modules/rate-limit';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(5).max(120),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(3000),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, bodySchema);
  const db = await getDb();
  const ipHash = await hashIp(clientIp(request), getConfig().hashSecret);
  await enforceRateLimit(db, `contact:${ipHash}`, RATE_RULES.contact);
  const user = await getSessionUser(db, readCookie(request, SESSION_COOKIE));
  await db
    .prepare(`INSERT INTO contact_messages(id, user_id, name, contact, subject, message, status, ip_hash, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'NEW', ?7, ?8)`)
    .bind(crypto.randomUUID(), user?.id ?? null, body.name, body.contact, body.subject, body.message, ipHash, toDbTime(new Date()))
    .run();
  return json({ data: { ok: true } }, { status: 201 });
});
