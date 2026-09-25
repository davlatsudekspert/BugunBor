import type { Metadata } from 'next';

import { ActionButton, PlanForm, SettingsForm } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { formatMoment, formatPhone, formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { listBillingRequests } from '@/modules/admin/service';
import { requireAdmin } from '@/modules/auth/current';
import { getBillingSettings, listPlans } from '@/modules/billing/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.billing.title, robots: { index: false, follow: false } };
}

const tone: Record<string, string> = { PENDING: 'bg-amber-50 text-amber-700', PAID: 'bg-emerald-50 text-emerald-700', CANCELED: 'bg-slate-100 text-slate-500' };

export default async function AdminBillingPage() {
  const user = await requireAdmin('/admin/billing');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const [requests, plans, settings] = await Promise.all([listBillingRequests(db, null), listPlans(db, { includeInactive: true }), getBillingSettings(db)]);
  const b = t.admin.billing;
  const planName = (code: string) => {
    const plan = plans.find((item) => item.code === code);
    return plan ? (locale === 'ru' ? plan.nameRu : plan.nameUz) : code;
  };
  const pending = requests.filter((request) => request.status === 'PENDING');
  const handled = requests.filter((request) => request.status !== 'PENDING').slice(0, 30);

  return (
    <AdminShell t={t} role={user.role} active="billing">
      <section>
        <h2 className="text-xl font-black text-navy">{b.requests}</h2>
        {pending.length ? (
          <div className="mt-3 space-y-3">
            {pending.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-black text-navy">{request.businessName}</p>
                  <p className="text-sm text-slate-600">{planName(request.planCode)} · {fmt(b.months, { count: request.months })} · <strong className="text-primary">{formatSum(request.amount, t)}</strong></p>
                  <p className="text-xs text-slate-500">{request.requesterName} {request.requesterPhone ? `· ${formatPhone(request.requesterPhone)}` : ''} · {formatMoment(parseDbTime(request.createdAt), t, locale)}</p>
                </div>
                <div className="flex gap-2">
                  <ActionButton payload={{ type: 'billing.confirm', requestId: request.id }} label={b.confirm} confirmText={`${b.confirm}: ${request.businessName} — ${formatSum(request.amount, t)}?`} tone="success" networkError={t.common.networkError} />
                  <ActionButton payload={{ type: 'billing.cancel', requestId: request.id }} label={b.cancel} confirmText={`${b.cancel}?`} tone="danger" networkError={t.common.networkError} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{b.noRequests}</p>
        )}
        {handled.length ? (
          <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm">
            {handled.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 truncate text-navy">{request.businessName} · {planName(request.planCode)} · {fmt(b.months, { count: request.months })} · {formatSum(request.amount, t)}</span>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', tone[request.status])}>{t.billing.requestStatus[request.status as keyof typeof t.billing.requestStatus]}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black text-navy">{b.plans}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanForm
              key={plan.code}
              value={{ code: plan.code, name: locale === 'ru' ? plan.nameRu : plan.nameUz, priceMonthlyUzs: plan.priceMonthlyUzs, maxBranches: plan.maxBranches, maxLiveDeals: plan.maxLiveDeals, maxStaff: plan.maxStaff, topSlots: plan.topSlots, isActive: plan.isActive }}
              labels={{ price: b.price, maxBranches: b.maxBranches, maxDeals: b.maxDeals, maxStaff: b.maxStaff, topSlots: b.topSlots, active: b.active, unlimitedHint: b.unlimitedHint, save: t.common.save, saved: t.common.saved, networkError: t.common.networkError }}
            />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black text-navy">{b.trialSettings}</h2>
        <div className="mt-3">
          <SettingsForm
            value={settings}
            plans={plans.map((plan) => ({ code: plan.code, name: locale === 'ru' ? plan.nameRu : plan.nameUz }))}
            labels={{ trialMonths: b.trialMonths, trialPlan: b.trialPlan, instructionsUz: b.instructionsUz, instructionsRu: b.instructionsRu, months: b.months, save: t.common.save, saved: t.common.saved, networkError: t.common.networkError }}
          />
        </div>
      </section>
    </AdminShell>
  );
}
