import type { Metadata } from 'next';

import { getDb } from '@/db/client';
import { formatPhone } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { offerSections } from '@/lib/offer';
import { BILLING_PERIODS } from '@/modules/billing/pricing';
import { getBillingSettings, listPlans } from '@/modules/billing/service';
import { getCompanyInfo } from '@/modules/company';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.offerTitle, description: t.legal.offerSubtitle, alternates: { canonical: '/oferta' } };
}

export default async function OfferPage() {
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const [plans, settings, company] = await Promise.all([listPlans(db), getBillingSettings(db), getCompanyInfo(db)]);
  const sections = offerSections(locale, {
    company: { ...company, phone: company.phone ? formatPhone(company.phone) : '' },
    plans: plans.map((plan) => ({ ...plan, name: locale === 'ru' ? (plan.nameRu ?? plan.nameUz) : plan.nameUz })),
    periods: BILLING_PERIODS,
    trialMonths: settings.trialMonths,
    site: 'bugunbor.uz',
  });
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{t.legal.offerTitle}</h1>
      <p className="mt-3 text-lg font-semibold text-slate-600">{t.legal.offerSubtitle}</p>
      <p className="mt-2 text-sm text-slate-500">{fmt(t.legal.updated, { date: '26.09.2026' })}</p>
      <nav className="mt-6 flex flex-wrap gap-2 text-xs font-bold" aria-label={t.legal.offerTitle}>
        {sections.map((section, index) => (
          <a key={section.id} href={`#${section.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:border-primary/40 hover:text-primary">{index + 1}. {section.title}</a>
        ))}
      </nav>
      <div className="mt-8 space-y-6">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-black text-navy">{index + 1}. {section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-2 leading-7 text-slate-600">{paragraph}</p>)}
            {section.items?.length ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-7 text-slate-600">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
