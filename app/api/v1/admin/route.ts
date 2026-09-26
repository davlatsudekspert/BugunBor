import { z } from 'zod';

import { getDb } from '@/db/client';
import { seedDemoData } from '@/db/seed';
import { getConfig, isTelegramConfigured } from '@/lib/env';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { saveCategory, setMessageStatus, updatePlan, updateSettings, updateUser } from '@/modules/admin/service';
import { apiModerator } from '@/modules/auth/api-user';
import { tryNormalizeUzbekPhone } from '@/modules/auth/phone';
import { cancelBillingRequest, confirmBillingRequest, grantPlan, grantTrial, setTariffsEnabled } from '@/modules/billing/service';
import { BILLING_PERIODS, TRIAL_MONTH_OPTIONS } from '@/modules/billing/pricing';
import { setReviewHidden } from '@/modules/engagement/reviews';
import { updateCompanyInfo } from '@/modules/company';
import { DEMO_SETTING, forgetDemoSetting } from '@/modules/demo';
import { DomainError } from '@/modules/errors';
import { AUTO_SETTING_KEYS, autoModerateBusiness, autoModerateDeal, autoModeratePendingDeals } from '@/modules/moderation/auto';
import { archiveDealByModerator, decideBusiness, decideDeal, removeImagesByModerator, setBusinessSuspended } from '@/modules/moderation/service';
import { resolveReport } from '@/modules/reports';
import { createTelegramApi } from '@/modules/telegram/api';
import { ensureTelegramWebhook } from '@/modules/telegram/setup';

const id = z.string().min(1).max(100);
const decision = z.enum(['APPROVE', 'REJECT']);
const reason = z.string().trim().max(800).default('');
const limit = z.number().int().min(1).max(100_000).nullable();
const planCode = z.enum(['START', 'BIZNES', 'PREMIUM']);

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('deal.decide'), dealId: id, decision, reason }),
  z.object({ type: z.literal('deal.archive'), dealId: id, reason }),
  z.object({ type: z.literal('business.decide'), businessId: id, decision, reason }),
  z.object({ type: z.literal('message.status'), messageId: id, status: z.enum(['NEW', 'READ', 'ARCHIVED']) }),
  z.object({ type: z.literal('images.remove'), target: z.enum(['BUSINESS', 'DEAL']), id, reason }),
  z.object({ type: z.literal('review.visibility'), reviewId: id, hidden: z.boolean(), reason }),
  z.object({ type: z.literal('report.resolve'), reportId: id, status: z.enum(['RESOLVED', 'DISMISSED']) }),
  // Admin only below.
  z.object({ type: z.literal('business.suspend'), businessId: id, suspended: z.boolean(), reason }),
  z.object({ type: z.literal('business.trial'), businessId: id, months: z.number().int().refine((value) => (TRIAL_MONTH_OPTIONS as readonly number[]).includes(value)) }),
  z.object({ type: z.literal('business.plan'), businessId: id, planCode, months: z.number().int().refine((value) => BILLING_PERIODS.some((period) => period.months === value)) }),
  z.object({ type: z.literal('billing.confirm'), requestId: id, note: z.string().max(300).optional() }),
  z.object({ type: z.literal('billing.cancel'), requestId: id, note: z.string().max(300).optional() }),
  z.object({ type: z.literal('plan.update'), code: planCode, priceMonthlyUzs: z.number().int().min(0).max(100_000_000), maxBranches: limit, maxLiveDeals: limit, maxStaff: limit, topSlots: z.number().int().min(0).max(100), isActive: z.boolean() }),
  z.object({
    type: z.literal('settings.update'),
    trialMonths: z.number().int().refine((value) => (TRIAL_MONTH_OPTIONS as readonly number[]).includes(value)),
    trialPlan: planCode,
    paymentInstructionsUz: z.string().max(2000),
    paymentInstructionsRu: z.string().max(2000),
  }),
  z.object({ type: z.literal('user.update'), userId: id, role: z.enum(['CUSTOMER', 'MODERATOR', 'ADMIN']).optional(), status: z.enum(['ACTIVE', 'BLOCKED']).optional() }),
  z.object({
    type: z.literal('category.save'),
    id: z.string().max(60).nullable().optional(),
    slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
    nameUz: z.string().trim().min(2).max(60),
    nameRu: z.string().trim().min(2).max(60),
    icon: z.string().max(40),
    sortOrder: z.number().int().min(0).max(1000),
    isActive: z.boolean(),
  }),
  z.object({ type: z.literal('telegram.webhook') }),
  z.object({ type: z.literal('automation.update'), key: z.enum(['businesses', 'deals', 'reviews']), on: z.boolean() }),
  z.object({ type: z.literal('tariffs.update'), on: z.boolean().optional(), freePlan: planCode.optional() }),
  z.object({ type: z.literal('demo.update'), on: z.boolean() }),
  z.object({
    type: z.literal('company.update'),
    legalName: z.string().trim().max(160),
    // STIR: 9 digits, companies only. A sole trader gives the registration
    // certificate instead; a 14-digit personal number is refused (it would be public).
    tin: z.string().trim().regex(/^(?:\d{9})?$/),
    registration: z.string().trim().max(120).default(''),
    address: z.string().trim().max(240),
    phone: z.string().trim().max(30),
    email: z.string().trim().max(120).refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
  }),
]);

const moderatorActions = new Set(['deal.decide', 'deal.archive', 'business.decide', 'message.status', 'images.remove', 'review.visibility', 'report.resolve']);

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const action = await readJson(request, actionSchema);
  const db = await getDb();
  const user = await apiModerator(request, db);
  if (!moderatorActions.has(action.type) && user.role !== 'ADMIN') throw new DomainError('FORBIDDEN');
  const actorId = user.id;

  switch (action.type) {
    case 'deal.decide':
      return json({ data: await decideDeal(db, { actorId, dealId: action.dealId, decision: action.decision, reason: action.reason }) });
    case 'deal.archive':
      await archiveDealByModerator(db, { actorId, dealId: action.dealId, reason: action.reason });
      return json({ data: { ok: true } });
    case 'business.decide': {
      const result = await decideBusiness(db, { actorId, businessId: action.businessId, decision: action.decision, reason: action.reason });
      // Deals sent while the business was in review get checked now.
      if (result.status === 'VERIFIED') await autoModeratePendingDeals(db, action.businessId);
      return json({ data: result });
    }
    case 'message.status':
      await setMessageStatus(db, { messageId: action.messageId, status: action.status });
      return json({ data: { ok: true } });
    case 'review.visibility':
      await setReviewHidden(db, { actorId, reviewId: action.reviewId, hidden: action.hidden, reason: action.reason });
      return json({ data: { ok: true } });
    case 'report.resolve':
      await resolveReport(db, { actorId, reportId: action.reportId, status: action.status });
      return json({ data: { ok: true } });
    case 'images.remove':
      await removeImagesByModerator(db, { actorId, target: action.target, id: action.id, reason: action.reason });
      return json({ data: { ok: true } });
    case 'business.suspend':
      await setBusinessSuspended(db, { actorId, businessId: action.businessId, suspended: action.suspended, reason: action.reason });
      return json({ data: { ok: true } });
    case 'business.trial':
      return json({ data: await grantTrial(db, { businessId: action.businessId, adminId: actorId, months: action.months }) });
    case 'business.plan':
      return json({ data: await grantPlan(db, { businessId: action.businessId, adminId: actorId, planCode: action.planCode, months: action.months }) });
    case 'billing.confirm':
      return json({ data: await confirmBillingRequest(db, { requestId: action.requestId, adminId: actorId, note: action.note }) });
    case 'billing.cancel':
      await cancelBillingRequest(db, { requestId: action.requestId, adminId: actorId, note: action.note });
      return json({ data: { ok: true } });
    case 'plan.update':
      await updatePlan(db, { ...action, actorId });
      return json({ data: { ok: true } });
    case 'settings.update':
      await updateSettings(db, {
        actorId,
        values: {
          trial_months: String(action.trialMonths),
          trial_plan: action.trialPlan,
          payment_instructions_uz: action.paymentInstructionsUz,
          payment_instructions_ru: action.paymentInstructionsRu,
        },
      });
      return json({ data: { ok: true } });
    case 'user.update':
      await updateUser(db, { actorId, userId: action.userId, role: action.role, status: action.status });
      return json({ data: { ok: true } });
    case 'category.save':
      return json({ data: await saveCategory(db, { ...action, id: action.id ?? null, actorId }) });
    case 'demo.update': {
      // The catalogue is written once (and refreshed later); hiding it only filters it out.
      if (action.on) await seedDemoData(db);
      await updateSettings(db, { actorId, values: { [DEMO_SETTING]: action.on ? '1' : '0' } });
      forgetDemoSetting(db);
      return json({ data: { ok: true } });
    }
    case 'tariffs.update': {
      if (action.freePlan) await updateSettings(db, { actorId, values: { free_plan: action.freePlan } });
      const result = action.on === undefined ? null : await setTariffsEnabled(db, { actorId, on: action.on });
      return json({ data: { ok: true, trialsGranted: result?.trialsGranted ?? 0 } });
    }
    case 'company.update': {
      const phone = action.phone ? tryNormalizeUzbekPhone(action.phone) : '';
      if (phone === null) throw new DomainError('VALIDATION');
      await updateCompanyInfo(db, { actorId, info: { legalName: action.legalName, tin: action.tin, registration: action.registration, address: action.address, phone, email: action.email } });
      return json({ data: { ok: true } });
    }
    case 'automation.update': {
      await updateSettings(db, { actorId, values: { [AUTO_SETTING_KEYS[action.key]]: action.on ? '1' : '0' } });
      // Switching it on also clears what is already waiting and passes the checks.
      if (action.on && action.key !== 'reviews') {
        const table = action.key === 'businesses' ? `businesses WHERE verification_status = 'PENDING'` : `deals WHERE status = 'PENDING_REVIEW'`;
        const waiting = await db.prepare(`SELECT id FROM ${table} AND deleted_at IS NULL ORDER BY submitted_at LIMIT 50`).all<{ id: string }>();
        for (const item of waiting.results) {
          if (action.key === 'businesses') await autoModerateBusiness(db, item.id);
          else await autoModerateDeal(db, item.id);
        }
      }
      return json({ data: { ok: true } });
    }
    case 'telegram.webhook': {
      const config = getConfig();
      if (!isTelegramConfigured(config)) throw new DomainError('TELEGRAM_NOT_CONFIGURED');
      const state = await ensureTelegramWebhook(db, config, { force: true });
      if (state?.error) throw new DomainError('WEBHOOK_FAILED', 502, { detail: state.error });
      if (state) return json({ data: { url: state.url } });
      // No https APP_URL: register the address this request came in on.
      const origin = new URL(request.url).origin;
      try {
        await createTelegramApi(config.telegram.botToken!).setWebhook(`${origin}/api/v1/telegram/webhook`, config.telegram.webhookSecret!);
      } catch (error) {
        throw new DomainError('WEBHOOK_FAILED', 502, { detail: error instanceof Error ? error.message : 'unknown' });
      }
      return json({ data: { url: `${origin}/api/v1/telegram/webhook` } });
    }
  }
});
