import type { Metadata } from 'next';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.how.title, description: t.how.text, alternates: { canonical: '/how-it-works' } };
}

function Steps({ title, steps }: { title: string; steps: readonly { title: string; text: string }[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{title}</h2>
      <ol className="mt-6 space-y-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-base font-black text-white">{index + 1}</span>
            <span><strong className="block text-lg text-navy">{step.title}</strong><span className="leading-7 text-slate-600">{step.text}</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HowItWorksPage() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">BugunBor</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-navy sm:text-5xl">{t.how.title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">{t.how.text}</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Steps title={t.how.customerTitle} steps={t.how.customerSteps} />
        <Steps title={t.how.businessTitle} steps={t.how.businessSteps} />
      </div>
      <section className="mt-6 rounded-3xl bg-navy p-6 text-white sm:p-8">
        <h2 className="text-2xl font-black tracking-[-.03em]">{t.how.rulesTitle}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {t.how.rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-slate-200"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden /> {rule}</li>
          ))}
        </ul>
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/discover" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-white">{t.codes.findDeals} <ArrowRight className="size-4" aria-hidden /></a>
        <a href="/business" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 font-bold text-navy">{t.nav.forBusiness}</a>
      </div>
    </main>
  );
}
