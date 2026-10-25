import { z } from 'zod';

import { getDb } from '@/db/client';
import { json, readJson, route } from '@/lib/http';
import { setMessageStatus, updateUser } from '@/modules/admin/service';
import { appOwner } from '@/modules/auth/app-owner';
import { autoModeratePendingDeals } from '@/modules/moderation/auto';
import { decideBusiness, decideDeal } from '@/modules/moderation/service';
import { resolveReport } from '@/modules/reports';

// POST /api/v1/admin/actions — the owner's decisions from the app. Every one
// is written by the same service the site's admin panel uses, with the audit
// log that comes with it.
const id = z.string().min(1).max(100);
const reason = z.string().trim().max(800).default('');
const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('business.decide'), businessId: id, decision: z.enum(['APPROVE', 'REJECT']), reason }),
  z.object({ type: z.literal('deal.decide'), dealId: id, decision: z.enum(['APPROVE', 'REJECT']), reason }),
  z.object({ type: z.literal('report.resolve'), reportId: id, status: z.enum(['RESOLVED', 'DISMISSED']) }),
  z.object({ type: z.literal('message.status'), messageId: id, status: z.enum(['READ', 'ARCHIVED']) }),
  z.object({ type: z.literal('user.update'), userId: id, role: z.enum(['CUSTOMER', 'MODERATOR']).optional(), status: z.enum(['ACTIVE', 'BLOCKED']).optional() }),
]);

export const POST = route(async (request: Request) => {
  const action = await readJson(request, actionSchema);
  const db = await getDb();
  const actorId = (await appOwner(request, db)).id;
  switch (action.type) {
    case 'business.decide': {
      const result = await decideBusiness(db, { actorId, businessId: action.businessId, decision: action.decision, reason: action.reason });
      if (result.status === 'VERIFIED') await autoModeratePendingDeals(db, action.businessId);
      return json({ data: result });
    }
    case 'deal.decide':
      return json({ data: await decideDeal(db, { actorId, dealId: action.dealId, decision: action.decision, reason: action.reason }) });
    case 'report.resolve':
      await resolveReport(db, { actorId, reportId: action.reportId, status: action.status });
      return json({ data: { ok: true } });
    case 'message.status':
      await setMessageStatus(db, { messageId: action.messageId, status: action.status });
      return json({ data: { ok: true } });
    case 'user.update':
      await updateUser(db, { actorId, userId: action.userId, role: action.role, status: action.status });
      return json({ data: { ok: true } });
  }
});
