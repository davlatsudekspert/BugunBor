import type { Metadata } from 'next';

import { PrintButton } from '@/components/business/print-button';
import { BusinessAvatar } from '@/components/deals/business-avatar';
import { QrCode } from '@/components/deals/qr-code';
import { getConfig } from '@/lib/env';
import { mediaUrl } from '@/lib/photos';
import { getI18n } from '@/lib/i18n/server';
import { requireWorkspace } from '@/modules/businesses/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.poster.title, robots: { index: false, follow: false } };
}

// A4 poster for the counter or the door: scan → business page → follow.
export default async function PosterPage() {
  const { t, db, membership } = await requireWorkspace('/business/poster');
  const business = await db.prepare(`SELECT logo_id AS logoId FROM businesses WHERE id = ?1`).bind(membership.businessId).first<{ logoId: string | null }>();
  const origin = getConfig().appUrl ?? 'https://bugunbor.uz';
  const url = `${origin}/businesses/${membership.slug}?source=poster`;
  const p = t.biz.poster;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-black tracking-[-.03em] text-navy">{p.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{p.intro}</p>
        </div>
        <PrintButton label={p.print} />
      </div>

      <article className="mx-auto flex aspect-[210/297] w-full max-w-[640px] flex-col items-center justify-between rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(20,40,55,.08)] print:aspect-auto print:h-[265mm] print:max-w-none print:break-inside-avoid print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-[12px] bg-primary text-xl font-black text-white">B</span>
          <span className="text-2xl font-black tracking-[-0.04em] text-navy">Bugun<span className="text-primary">Bor</span></span>
        </div>

        <div>
          <BusinessAvatar name={membership.name} logo={mediaUrl(business?.logoId)} className="mx-auto size-20 rounded-3xl bg-navy text-2xl font-black text-white" />
          <p className="mt-4 text-3xl font-black tracking-[-.04em] text-navy">{membership.name}</p>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-.05em] text-primary">{p.headline}</h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-slate-600">{p.text}</p>
        </div>

        <div className="flex flex-col items-center">
          <QrCode value={url} label={membership.name} className="size-56 rounded-2xl border-4 border-navy p-2 print:size-[75mm]" />
          <p className="mt-2 text-sm font-black uppercase tracking-[.2em] text-navy">{p.scan}</p>
        </div>

        <ol className="grid w-full gap-2 text-left sm:grid-cols-3">
          {p.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2 rounded-2xl bg-cream p-3 text-sm font-semibold text-navy">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-white">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </article>
    </main>
  );
}
