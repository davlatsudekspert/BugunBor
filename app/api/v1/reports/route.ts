import { z } from 'zod';

import { getDb } from '@/db/client';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';
import { REPORT_REASONS, REPORT_TARGETS, createReport } from '@/modules/reports';

const bodySchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().min(1).max(100),
  reason: z.enum(REPORT_REASONS),
  comment: z.string().trim().max(500).optional(),
});

// Report a deal, a business or a review; moderators get it in Admin → Shikoyatlar.
export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, bodySchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  await enforceRateLimit(db, `report:${user.id}`, RATE_RULES.contact);
  const report = await createReport(db, { reporterId: user.id, targetType: body.targetType, targetId: body.targetId, reason: body.reason, comment: body.comment || null });
  return json({ data: report }, { status: report.repeated ? 200 : 201 });
});
