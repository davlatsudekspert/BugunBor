import type { Metadata } from 'next';
import { ArrowRight, BarChart3, BellRing, Building2, Check, Gift, QrCode, Star, Wallet } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { getDb } from '@/db/client';
import { formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/modules/auth/current';
import { getBillingSettings, listPlans } from '@/modules/billing/service';
import { listMemberships } from '@/modules/businesses/access';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.forBusiness, description: t.forBusiness.text, alternates: { canonical: '/business' } };
}

const featureIcons = [Wallet, BellRing, QrCode, Star, Building2, BarChart3];

export default async function BusinessLandingPage() {
  const [{ t, locale }, user, db] = await Promise.all([getI18n(), getCurrentUser(), getDb()]);
  const [memberships, allPlans, settings] = await Promise.all([user ? listMemberships(db, user.id) : Promise.resolve([]), listPlans(db, { includeInactive: true }), getBillingSettings(db)]);
  const plans = allPlans.filter((plan) => plan.isActive);
  const primaryHref = memberships.length ? '/business/dashboard' : '/business/onboarding';
  const limit = (value: number | null) => (value === null ? t.billing.unlimited : String(value));
  const planFeatures = (plan: (typeof plans)[number]) => [
    fmt(t.billing.features.branches, { value: limit(plan.maxBranches) }),
    fmt(t.billing.features.deals, { value: limit(plan.maxLiveDeals) }),
    fmt(t.billing.features.staff, { value: limit(plan.maxStaff) }),
    fmt(t.billing.features.top, { value: plan.topSlots }),
    t.billing.features.base,
  ];
  // Free launch: no prices anywhere — the gifted plan is shown instead.
  const free = !settings.tariffsEnabled;
  const gift = allPlans.find((plan) => plan.code === settings.freePlan);
  const giftName = gift ? (locale === 'ru' ? gift.nameRu : gift.nameUz) : 'Premium';

  return (
    <main>
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.15em] text-orange-300">{t.forBusiness.kicker}</p>
            <h1 className="mt-4 text-5xl font-black leading-[.98] tracking-[-.06em] sm:text-6xl">{t.forBusiness.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{t.forBusiness.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={primaryHref} className={cn(buttonVariants(), 'h-12 rounded-xl bg-orange-500 px-6 font-bold text-white hover:bg-orange-400')}>
                {memberships.length ? t.forBusiness.dashboard : t.forBusiness.cta} <ArrowRight className="ml-2 size-4" aria-hidden />
              </a>
              <a href={free ? '#sovga' : '#tariffs'} className={cn(buttonVariants({ variant: 'outline' }), 'h-12 rounded-xl border-white/20 bg-white/5 px-6 text-white hover:bg-white/10')}>
                {free ? fmt(t.forBusiness.giftTitle, { plan: giftName }) : t.billing.choosePlan}
              </a>
            </div>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-bold text-emerald-200">
              {free ? <><Gift className="size-4" aria-hidden /> {fmt(t.forBusiness.freeNote, { plan: giftName })}</> : fmt(t.billing.notStartedText, { months: settings.trialMonths })}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.forBusiness.features.map((feature, index) => {
              const Icon = featureIcons[index] ?? Check;
              return (
                <div key={feature.title} className={cn('rounded-3xl p-6', index === 1 ? 'bg-orange-500' : index === 0 ? 'bg-white text-navy' : 'bg-white/8')}>
                  <Icon className={cn('size-7', index === 0 ? 'text-orange-500' : index === 1 ? 'text-white' : 'text-orange-300')} aria-hidden />
                  <strong className="mt-6 block text-2xl font-black">{feature.title}</strong>
                  <span className={cn('mt-1 block text-sm', index === 0 ? 'text-slate-500' : index === 1 ? 'text-orange-100' : 'text-slate-300')}>{index === 0 && free ? fmt(t.forBusiness.freeFeatureText, { plan: giftName }) : feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-black tracking-[-.04em] text-navy">{t.forBusiness.stepsTitle}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {t.forBusiness.steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-white">{index + 1}</span>
              <strong className="mt-4 block text-lg text-navy">{step.title}</strong>
              <span className="mt-1 block text-sm leading-6 text-slate-600">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {free ? (
        <section id="sovga" className="border-t border-slate-200 bg-sand">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary"><Gift className="size-4" aria-hidden /> {t.forBusiness.giftPrice}</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-.04em] text-navy">{fmt(t.forBusiness.giftTitle, { plan: giftName })}</h2>
              <p className="mt-3 max-w-xl leading-7 text-slate-600">{fmt(t.forBusiness.giftText, { months: settings.trialMonths })}</p>
              <a href={primaryHref} className={cn(buttonVariants(), 'mt-6 h-12 rounded-xl px-6 font-bold')}>{memberships.length ? t.forBusiness.dashboard : t.forBusiness.cta} <ArrowRight className="ml-2 size-4" aria-hidden /></a>
            </div>
            {gift ? (
              <div className="rounded-3xl border border-primary bg-white p-6 shadow-[0_18px_50px_rgba(245,89,55,.15)]">
                <h3 className="text-xl font-black text-navy">{giftName}</h3>
                <p className="mt-3 text-3xl font-black text-primary">{t.forBusiness.giftPrice}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  {planFeatures(gift).map((feature) => (
                    <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> {feature}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
      <section id="tariffs" className="border-t border-slate-200 bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-black tracking-[-.04em] text-navy">{t.billing.choosePlan}</h2>
          <p className="mt-2 text-slate-600">{fmt(t.billing.notStartedText, { months: settings.trialMonths })}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan.code === 'BIZNES';
              return (
                <div key={plan.code} className={cn('flex flex-col rounded-3xl border bg-white p-6', featured ? 'border-primary shadow-[0_18px_50px_rgba(245,89,55,.15)]' : 'border-slate-200')}>
                  <h3 className="text-xl font-black text-navy">{locale === 'ru' ? plan.nameRu : plan.nameUz}</h3>
                  <p className="mt-3"><strong className="text-3xl font-black text-primary">{formatSum(plan.priceMonthlyUzs, t)}</strong> <span className="text-sm text-slate-500">/ {t.billing.perMonth}</span></p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                    {planFeatures(plan).map((feature) => (
                      <li key={feature} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> {feature}</li>
                    ))}
                  </ul>
                  <a href={primaryHref} className={cn(buttonVariants({ variant: featured ? 'default' : 'outline' }), 'mt-6 h-11 rounded-xl font-bold')}>{t.forBusiness.cta}</a>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}
    </main>
  );
}
