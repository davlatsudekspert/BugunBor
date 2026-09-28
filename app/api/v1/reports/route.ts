import { z } from 'zod';

import { getDb } from '@/db/client';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { apiUser } from '@/modules/auth/api-user';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';
import { DomainError } from '@/modules/errors';
import { CODE_ISSUES, REPORT_REASONS, REPORT_TARGETS, createReport, reportCodeIssue, type CodeIssue, type ReportReason } from '@/modules/reports';

const bodySchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().min(1).max(100),
  reason: z.enum([...REPORT_REASONS, ...CODE_ISSUES]),
  comment: z.string().trim().max(500).optional(),
});

const isCodeIssue = (reason: string): reason is CodeIssue => (CODE_ISSUES as readonly string[]).includes(reason);
const isReportReason = (reason: string): reason is ReportReason => (REPORT_REASONS as readonly string[]).includes(reason);

// Report a deal, a business or a review, or say a booked code was not
// honoured; moderators get it in Admin → Shikoyatlar.
export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, bodySchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  await enforceRateLimit(db, `report:${user.id}`, RATE_RULES.contact);
  const comment = body.comment || null;
  if (body.targetType === 'REDEMPTION') {
    if (!isCodeIssue(body.reason)) throw new DomainError('VALIDATION');
    const report = await reportCodeIssue(db, { userId: user.id, redemptionId: body.targetId, issue: body.reason, comment });
    return json({ data: report }, { status: report.repeated ? 200 : 201 });
  }
  if (!isReportReason(body.reason)) throw new DomainError('VALIDATION');
  const report = await createReport(db, { reporterId: user.id, targetType: body.targetType, targetId: body.targetId, reason: body.reason, comment });
  return json({ data: report }, { status: report.repeated ? 200 : 201 });
});
