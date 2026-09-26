import type { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';

import { getDb } from '@/db/client';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { getBillingSettings, listPlans } from '@/modules/billing/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.faq.title, alternates: { canonical: '/faq' } };
}

export default async function FaqPage() {
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const [settings, plans] = await Promise.all([getBillingSettings(db), listPlans(db, { includeInactive: true })]);
  const gift = plans.find((plan) => plan.code === settings.freePlan);
  // During the free launch the pricing answer talks about the gift, not about tariffs.
  const items = t.faq.items.map((item, index) =>
    index === 0 && !settings.tariffsEnabled
      ? { ...item, a: fmt(t.faq.freeAnswer, { plan: gift ? (locale === 'ru' ? gift.nameRu : gift.nameUz) : 'Premium', months: settings.trialMonths }) }
      : item,
  );
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  };
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{t.faq.title}</h1>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-navy [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-3 leading-7 text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-slate-600">
        <a href="/contact" className="font-bold text-primary">{t.footer.contact} →</a>
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replaceAll('<', '\\u003c') }} />
    </main>
  );
}
