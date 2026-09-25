import { z } from 'zod';

import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { maskPhone } from '@/lib/format';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import type { BusinessAction } from '@/modules/auth/authorization';
import { apiUser } from '@/modules/auth/current';
import { BILLING_PERIODS, requestPlan } from '@/modules/billing/service';
import { assertNotSuspended, requireMembership } from '@/modules/businesses/access';
import { branchSchema, businessProfileSchema, teamAddSchema } from '@/modules/businesses/schema';
import { addMember, changeMemberRole, createBranch, deleteBranch, removeMember, updateBranch, updateBusinessProfile } from '@/modules/businesses/service';
import { dealInputSchema } from '@/modules/deals/schema';
import { createDeal, duplicateDeal, setDealTop, transitionDeal, updateDeal } from '@/modules/deals/service';
import { DomainError } from '@/modules/errors';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';
import { codeFromScan } from '@/modules/redemptions/codes';
import { completeRedemption, lookupRedemption, runMaintenance } from '@/modules/redemptions/service';

const id = z.string().min(1).max(100);
const role = z.enum(['OWNER', 'MANAGER', 'CASHIER']);

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile.update'), data: businessProfileSchema, resubmit: z.boolean().default(false) }),
  z.object({ type: z.literal('deal.create'), input: dealInputSchema, submit: z.boolean() }),
  z.object({ type: z.literal('deal.update'), dealId: id, input: dealInputSchema, submit: z.boolean() }),
  z.object({ type: z.literal('deal.transition'), dealId: id, action: z.enum(['submit', 'withdraw', 'pause', 'resume', 'end', 'delete']) }),
  z.object({ type: z.literal('deal.duplicate'), dealId: id }),
  z.object({ type: z.literal('deal.top'), dealId: id, on: z.boolean() }),
  z.object({ type: z.literal('branch.create'), data: branchSchema }),
  z.object({ type: z.literal('branch.update'), branchId: id, data: branchSchema }),
  z.object({ type: z.literal('branch.delete'), branchId: id }),
  z.object({ type: z.literal('team.add'), data: teamAddSchema }),
  z.object({ type: z.literal('team.role'), memberId: id, role }),
  z.object({ type: z.literal('team.remove'), memberId: id }),
  z.object({ type: z.literal('redeem.lookup'), code: z.string().max(200) }),
  z.object({ type: z.literal('redeem.complete'), redemptionId: id }),
  z.object({ type: z.literal('billing.request'), planCode: z.string().max(20), months: z.number().int().refine((value) => BILLING_PERIODS.some((period) => period.months === value)) }),
]);

type Action = z.infer<typeof actionSchema>;

const permission: Record<Action['type'], BusinessAction> = {
  'profile.update': 'business.edit',
  'deal.create': 'deal.write',
  'deal.update': 'deal.write',
  'deal.transition': 'deal.write',
  'deal.duplicate': 'deal.write',
  'deal.top': 'deal.write',
  'branch.create': 'branch.write',
  'branch.update': 'branch.write',
  'branch.delete': 'branch.write',
  'team.add': 'team.manage',
  'team.role': 'team.manage',
  'team.remove': 'team.manage',
  'redeem.lookup': 'redemption.validate',
  'redeem.complete': 'redemption.validate',
  'billing.request': 'business.edit',
};

// Everything that changes what customers can see or claim is blocked while suspended.
const blockedWhenSuspended = new Set<Action['type']>(['deal.create', 'deal.update', 'deal.transition', 'deal.duplicate', 'deal.top', 'branch.create']);

export const POST = route(async (request: Request, context: { params: Promise<{ businessId: string }> }) => {
  assertSameOrigin(request);
  const action = await readJson(request, actionSchema);
  const db = await getDb();
  const user = await apiUser(request, db);
  const { businessId } = await context.params;
  const membership = await requireMembership(db, user.id, businessId, permission[action.type]);
  if (blockedWhenSuspended.has(action.type)) assertNotSuspended(membership);
  const actor = { businessId, userId: user.id };

  switch (action.type) {
    case 'profile.update':
      await updateBusinessProfile(db, { ...actor, data: action.data, resubmit: action.resubmit });
      return json({ data: { ok: true } });
    case 'deal.create':
      return json({ data: await createDeal(db, { ...actor, input: action.input, submit: action.submit }) }, { status: 201 });
    case 'deal.update':
      return json({ data: await updateDeal(db, { ...actor, dealId: action.dealId, input: action.input, submit: action.submit }) });
    case 'deal.transition':
      if (action.action === 'resume' || action.action === 'submit') assertNotSuspended(membership);
      return json({ data: await transitionDeal(db, { ...actor, dealId: action.dealId, action: action.action }) });
    case 'deal.duplicate':
      return json({ data: await duplicateDeal(db, { ...actor, dealId: action.dealId }) }, { status: 201 });
    case 'deal.top':
      await setDealTop(db, { ...actor, dealId: action.dealId, on: action.on });
      return json({ data: { ok: true } });
    case 'branch.create':
      return json({ data: await createBranch(db, { ...actor, data: action.data }) }, { status: 201 });
    case 'branch.update':
      await updateBranch(db, { ...actor, branchId: action.branchId, data: action.data });
      return json({ data: { ok: true } });
    case 'branch.delete':
      await deleteBranch(db, { ...actor, branchId: action.branchId });
      return json({ data: { ok: true } });
    case 'team.add':
      return json({ data: await addMember(db, { ...actor, phone: action.data.phone, role: action.data.role }) }, { status: 201 });
    case 'team.role':
      await changeMemberRole(db, { ...actor, memberId: action.memberId, role: action.role });
      return json({ data: { ok: true } });
    case 'team.remove':
      await removeMember(db, { ...actor, memberId: action.memberId });
      return json({ data: { ok: true } });
    case 'redeem.lookup': {
      await enforceRateLimit(db, `redeem:${user.id}`, RATE_RULES.redeemLookup);
      await runMaintenance(db);
      const code = codeFromScan(action.code);
      if (!code) throw new DomainError('CODE_NOT_FOUND');
      const found = await lookupRedemption(db, { businessId, code, secret: getConfig().hashSecret });
      return json({ data: { ...found, customerPhone: maskPhone(found.customerPhone) } });
    }
    case 'redeem.complete':
      return json({ data: await completeRedemption(db, { businessId, redemptionId: action.redemptionId, staffUserId: user.id }) });
    case 'billing.request':
      return json({ data: await requestPlan(db, { businessId, userId: user.id, planCode: action.planCode, months: action.months }) }, { status: 201 });
  }
});
