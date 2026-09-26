import { z } from 'zod';

import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { DomainError } from '@/modules/errors';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';
import { claimDeal, runMaintenance } from '@/modules/redemptions/service';

const bodySchema = z.object({ branchId: z.string().min(1).max(100) });

export const POST = route(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(request);
  const idempotencyKey = request.headers.get('idempotency-key') ?? '';
  if (idempotencyKey.length < 12 || idempotencyKey.length > 120) throw new DomainError('VALIDATION', 400);
  const body = await readJson(request, bodySchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  await enforceRateLimit(db, `claim:${user.id}`, RATE_RULES.claim);
  await runMaintenance(db);

  const { id } = await context.params;
  const config = getConfig();
  const result = await claimDeal(db, { dealId: id, branchId: body.branchId, userId: user.id, idempotencyKey, secret: config.hashSecret, allowDemo: config.isDevelopment });
  return json({ data: result }, { status: result.replayed ? 200 : 201 });
});
