import type { Metadata } from 'next';
import { CreditCard, Info } from 'lucide-react';

import { BillingPlans } from '@/components/business/billing-plans';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { formatDay, formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { formatNumericDate, parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { getBillingSettings, listPlans } from '@/modules/billing/service';
import { requireWorkspace } from '@/modules/businesses/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.billing.title, robots: { index: false, follow: false } };
}

const requestTone: Record<string, string> = { PENDING: 'bg-amber-50 text-amber-700', PAID: 'bg-emerald-50 text-emerald-700', CANCELED: 'bg-slate-100 text-slate-600' };

export default async function BillingPage() {
  const ws = await requireWorkspace('/business/billing', 'business.edit');
  const { t, locale, db, membership, subscription } = ws;
  const [plans, settings, requests] = await Promise.all([
    listPlans(db),
    getBillingSettings(db),
    db.prepare(`SELECT id, plan_code AS planCode, months, amount_uzs AS amount, status, created_at AS createdAt FROM billing_requests WHERE business_id = ?1 ORDER BY created_at DESC LIMIT 20`)
      .bind(membership.businessId)
      .all<{ id: string; planCode: string; months: number; amount: number; status: string; createdAt: string }>(),
  ]);
  const b = t.billing;
  const planName = (code: string | null | undefined) => {
    const plan = plans.find((item) => item.code === code);
    return plan ? (locale === 'ru' ? plan.nameRu : plan.nameUz) : (code ?? '');
  };
  const limit = (value: number | null) => (value === null ? b.unlimited : String(value));
  const pending = requests.results.find((request) => request.status === 'PENDING');
  const instructions = (locale === 'ru' ? settings.paymentInstructionsRu : settings.paymentInstructionsUz) || b.defaultInstructions;
  const statusText =
    subscription.status === 'TRIAL'
      ? fmt(b.trialText, { plan: planName(subscription.plan?.code), date: formatNumericDate(parseDbTime(subscription.endsAt!)) })
      : subscription.status === 'ACTIVE'
        ? fmt(b.activeText, { plan: planName(subscription.plan?.code), date: formatNumericDate(parseDbTime(subscription.endsAt!)) })
        : subscription.status === 'EXPIRED'
          ? b.expiredText
          : fmt(b.notStartedText, { months: settings.trialMonths });

  return (
    <WorkspaceShell ws={ws} active="billing">
      <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{b.title}</h2>
      <section className={cn('mt-4 rounded-3xl p-6', subscription.status === 'EXPIRED' ? 'bg-red-600 text-white' : 'bg-navy text-white')}>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-orange-200"><CreditCard className="size-4" aria-hidden /> {b.status[subscription.status]}</p>
        <p className="mt-2 max-w-2xl text-lg font-semibold leading-7">{statusText}</p>
      </section>

      {pending ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {fmt(b.pending, { plan: planName(pending.planCode), months: pending.months, amount: formatSum(pending.amount, t) })}
        </p>
      ) : null}

      <section className="mt-8">
        <h3 className="mb-4 text-xl font-black text-navy">{b.choosePlan}</h3>
        <BillingPlans
          businessId={membership.businessId}
          currentPlan={subscription.status === 'ACTIVE' ? (subscription.plan?.code ?? null) : null}
          canRequest={membership.role === 'OWNER'}
          plans={plans.map((plan) => ({
            code: plan.code,
            name: locale === 'ru' ? plan.nameRu : plan.nameUz,
            priceMonthlyUzs: plan.priceMonthlyUzs,
            features: [
              fmt(b.features.branches, { value: limit(plan.maxBranches) }),
              fmt(b.features.deals, { value: limit(plan.maxLiveDeals) }),
              fmt(b.features.staff, { value: limit(plan.maxStaff) }),
              fmt(b.features.top, { value: plan.topSlots }),
              b.features.base,
            ],
          }))}
          t={{ billing: t.billing, common: t.common }}
        />
        {membership.role !== 'OWNER' ? <p className="mt-3 text-sm text-slate-500">{b.ownerOnly}</p> : null}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 font-black text-navy"><Info className="size-5 text-primary" aria-hidden /> {b.howToPay}</h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{instructions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-black text-navy">{b.history}</h3>
          {requests.results.length ? (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {requests.results.map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-navy">{planName(request.planCode)} · {fmt(b.months, { count: request.months })} · {formatSum(request.amount, t)} <span className="text-xs text-slate-400">({formatDay(parseDbTime(request.createdAt), t, locale)})</span></span>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', requestTone[request.status])}>{b.requestStatus[request.status as keyof typeof b.requestStatus]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">—</p>
          )}
        </div>
      </section>
    </WorkspaceShell>
  );
}
