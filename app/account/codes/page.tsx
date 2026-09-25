import type { Metadata } from 'next';
import { MapPin, Navigation, TicketCheck } from 'lucide-react';

import { CancelCodeButton } from '@/components/account/account-actions';
import { RateVisit } from '@/components/account/rate-visit';
import { Countdown } from '@/components/deals/countdown';
import { DealVisual } from '@/components/deals/deal-visual';
import { QrCode } from '@/components/deals/qr-code';
import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { formatMoment, formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { directionsUrl } from '@/lib/maps';
import { formatClock, parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { requireUser } from '@/modules/auth/current';
import { givenRatings, reviewableRedemptions } from '@/modules/engagement/reviews';
import { formatRedemptionCode } from '@/modules/redemptions/codes';
import { listCustomerRedemptions, runMaintenance } from '@/modules/redemptions/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.codes.title, robots: { index: false, follow: false } };
}

const statusTone = {
  CLAIMED: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-sky-50 text-sky-700',
  EXPIRED: 'bg-slate-100 text-slate-600',
  CANCELED: 'bg-slate-100 text-slate-600',
} as const;

export default async function CodesPage() {
  const user = await requireUser('/account/codes');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const config = getConfig();
  await runMaintenance(db);
  const [redemptions, reviewable, ratings] = await Promise.all([
    listCustomerRedemptions(db, user.id, config.hashSecret),
    reviewableRedemptions(db, user.id),
    givenRatings(db, user.id),
  ]);
  const active = redemptions.filter((item) => item.status === 'CLAIMED');
  const history = redemptions.filter((item) => item.status !== 'CLAIMED');
  const origin = config.appUrl ?? 'https://bugunbor.uz';

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{t.codes.title}</h1>

      {redemptions.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <TicketCheck className="mx-auto size-10 text-slate-300" aria-hidden />
          <h2 className="mt-4 text-xl font-bold text-navy">{t.codes.emptyTitle}</h2>
          <p className="mt-2 text-slate-500">{t.codes.emptyText}</p>
          <a href="/discover" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 font-bold text-white">{t.codes.findDeals}</a>
        </div>
      ) : null}

      {active.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-[.14em] text-slate-500">{t.codes.active}</h2>
          <div className="mt-4 space-y-4">
            {active.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_18px_50px_rgba(20,40,55,.08)]">
                <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-500">{item.businessName}</p>
                    <a href={`/deals/${item.dealSlug}`} className="mt-1 block text-xl font-black text-navy hover:text-primary">{item.dealTitle}</a>
                    <p className="mt-2 text-lg font-black text-primary">{formatSum(item.price, t)}</p>
                    <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-500"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {item.branchName}, {item.address}</p>
                    <a href={directionsUrl(item)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary"><Navigation className="size-4" aria-hidden /> {t.common.directions}</a>
                    <div className="mt-5 rounded-2xl bg-navy p-4 text-white">
                      <p className="text-xs font-bold uppercase tracking-[.14em] text-orange-200">{t.codes.expiresIn}</p>
                      <Countdown target={item.expiresAt} daysLabel={t.common.daysShort} className="tabular mt-1 block font-mono text-2xl font-black" />
                      <p className="mt-1 text-xs text-slate-300">{fmt(t.codes.validUntil, { time: formatClock(parseDbTime(item.expiresAt)) })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-50 p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-800">{t.claim.yourCode}</p>
                    <p className="mt-1 font-mono text-4xl font-black tracking-[.12em] text-navy" aria-label={fmt(t.codes.codeAria, { code: item.code ?? '' })}>{formatRedemptionCode(item.code ?? '')}</p>
                    <QrCode value={`${origin}/r/${item.code}`} label={fmt(t.codes.qrAria, { code: item.code ?? '' })} className="mt-3 size-44 rounded-xl bg-white p-2" />
                    <p className="mt-2 max-w-44 text-xs text-emerald-900">{t.codes.showToCashier}</p>
                  </div>
                </div>
                <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                  <CancelCodeButton redemptionId={item.id} labels={{ button: t.codes.cancel, ask: t.codes.cancelAsk, error: t.common.unknownError }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {history.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-black uppercase tracking-[.14em] text-slate-500">{t.codes.history}</h2>
          <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {history.map((item) => {
              const given = ratings.get(item.id);
              return (
                <li key={item.id} id={`review-${item.id}`} className="scroll-mt-24 p-4">
                  <div className="flex items-center gap-4">
                    <DealVisual visual={item.visual} categorySlug={item.categorySlug} photo={item.photo} className="size-14 shrink-0 rounded-xl" emojiClassName="-bottom-2 -right-1 text-4xl" />
                    <div className="min-w-0 flex-1">
                      <a href={`/deals/${item.dealSlug}`} className="block truncate font-bold text-navy hover:text-primary">{item.dealTitle}</a>
                      <p className="truncate text-sm text-slate-500">{item.businessName} · {formatMoment(parseDbTime(item.completedAt ?? item.createdAt), t, locale)}</p>
                      {given ? <p className="mt-0.5 text-xs font-bold text-amber-700">{fmt(t.codes.rated, { rating: given })}</p> : null}
                    </div>
                    <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-bold', statusTone[item.status])}>{t.codes.status[item.status]}</span>
                  </div>
                  {reviewable.has(item.id) ? (
                    <RateVisit
                      redemptionId={item.id}
                      labels={{ title: t.codes.rateTitle, aria: t.codes.rateAria, placeholder: t.codes.ratePlaceholder, submit: t.codes.rateSubmit, thanks: t.codes.rateThanks, networkError: t.common.networkError }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
