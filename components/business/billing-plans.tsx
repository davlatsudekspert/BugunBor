'use client';

import { Check, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import type { Dictionary } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { BILLING_PERIODS, periodPrice } from '@/modules/billing/pricing';
import { FormMessage } from './form-controls';

export type PlanCard = { code: string; name: string; priceMonthlyUzs: number; features: string[] };

/** Which online checkouts work right now; the others show "coming soon". */
export type OnlinePayments = { payme: boolean; click: boolean; paymeSandbox: boolean };

const PROVIDERS = [
  { code: 'PAYME', key: 'payme', name: 'Payme', logo: '/payments/payme.svg' },
  { code: 'CLICK', key: 'click', name: 'Click', logo: '/payments/click.svg' },
] as const;

const money = (value: number, sum: string) => `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${sum}`;

export function BillingPlans({ businessId, plans, currentPlan, canRequest, online, t }: { businessId: string; plans: PlanCard[]; currentPlan: string | null; canRequest: boolean; online: OnlinePayments; t: Pick<Dictionary, 'billing' | 'common'> }) {
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const b = t.billing;

  async function request(planCode: string) {
    setBusy(planCode);
    setMessage(null);
    const result = await apiRequest(`/api/v1/business/${businessId}`, { type: 'billing.request', planCode, months }, { networkError: t.common.networkError });
    setBusy(null);
    if (!result.ok) {
      setMessage({ tone: 'error', text: result.message });
      return;
    }
    setMessage({ tone: 'success', text: b.requested });
    setTimeout(() => window.location.reload(), 1200);
  }

  // Opens the provider's checkout; the plan switches on only when the provider's server confirms the payment.
  async function checkout(planCode: string, provider: 'PAYME' | 'CLICK') {
    setBusy(`${planCode}:${provider}`);
    setMessage(null);
    const result = await apiRequest<{ url: string }>(`/api/v1/business/${businessId}`, { type: 'billing.checkout', planCode, months, provider }, { networkError: t.common.networkError });
    if (!result.ok) {
      setBusy(null);
      setMessage({ tone: 'error', text: result.message });
      return;
    }
    setMessage({ tone: 'success', text: b.redirecting });
    window.location.assign(result.data.url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={b.period}>
        <span className="mr-1 text-sm font-bold text-navy">{b.period}:</span>
        {BILLING_PERIODS.map((period) => (
          <label key={period.months} className={cn('inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40', months === period.months ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600')}>
            <input type="radio" name="billing-period" value={period.months} checked={months === period.months} onChange={() => setMonths(period.months)} className="sr-only" />
            {fmt(b.months, { count: period.months })}
            {period.discountPercent ? <span className={cn('rounded-full px-1.5 text-xs', months === period.months ? 'bg-white/20' : 'bg-emerald-50 text-emerald-700')}>{fmt(b.discount, { percent: period.discountPercent })}</span> : null}
          </label>
        ))}
      </div>
      {message ? <div className="mt-4"><FormMessage tone={message.tone}>{message.text}</FormMessage></div> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const total = periodPrice(plan.priceMonthlyUzs, months) ?? 0;
          const featured = plan.code === 'BIZNES';
          return (
            <div key={plan.code} className={cn('flex flex-col rounded-3xl border bg-white p-6', featured ? 'border-primary shadow-[0_18px_50px_rgba(245,89,55,.12)]' : 'border-slate-200')}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-navy">{plan.name}</h3>
                {currentPlan === plan.code ? <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{b.current}</span> : null}
              </div>
              <p className="mt-3"><strong className="text-3xl font-black text-primary">{money(plan.priceMonthlyUzs, t.common.sum)}</strong> <span className="text-sm text-slate-500">/ {b.perMonth}</span></p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> {feature}</li>)}
              </ul>
              <p className="mt-5 text-sm font-bold text-navy">{fmt(b.total, { amount: money(total, t.common.sum) })}</p>
              <button type="button" disabled={!canRequest || busy !== null} onClick={() => void request(plan.code)} className={cn('mt-3 flex h-11 items-center justify-center gap-2 rounded-xl font-bold disabled:opacity-50', featured ? 'bg-primary text-white' : 'border border-slate-200 text-navy hover:border-primary/40')}>
                {busy === plan.code ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
                {busy === plan.code ? b.requesting : b.request}
              </button>
              <p className="mt-4 text-xs font-bold text-slate-500">{b.payOnline}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PROVIDERS.map((provider) => {
                  const live = online[provider.key];
                  const label = live ? fmt(b.payWith, { provider: provider.name }) : fmt(b.soonHint, { provider: provider.name });
                  return (
                    <button
                      key={provider.code}
                      type="button"
                      disabled={!live || !canRequest || busy !== null}
                      onClick={() => void checkout(plan.code, provider.code)}
                      aria-label={label}
                      title={label}
                      className="relative flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 transition hover:border-primary/40 disabled:cursor-not-allowed disabled:hover:border-slate-200"
                    >
                      {busy === `${plan.code}:${provider.code}` ? (
                        <LoaderCircle className="size-4 animate-spin text-slate-500" aria-hidden />
                      ) : (
                        <img src={provider.logo} alt={provider.name} className={cn('h-5 w-auto', !live && 'opacity-45 grayscale')} />
                      )}
                      {!live ? <span className="absolute -top-2.5 right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-navy shadow-sm">{b.soon}</span> : null}
                    </button>
                  );
                })}
              </div>
              {online.payme && online.paymeSandbox ? <p className="mt-2 text-xs font-semibold text-amber-700">Payme · {b.sandbox}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
