import { ArrowRight, BadgeCheck, Clock3, MapPin } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cityName } from '@/lib/cities';
import { formatMoment, formatNumber, formatSum, initials } from '@/lib/format';
import { fmt, type Dictionary, type Locale } from '@/lib/i18n';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { DealCard as DealCardData } from '@/modules/catalog/queries';
import { Countdown } from './countdown';
import { DealVisual } from './deal-visual';
import { FavoriteButton } from './favorite-button';

type Props = {
  deal: DealCardData;
  t: Dictionary;
  locale: Locale;
  favorite: boolean;
  loggedIn: boolean;
  showCity?: boolean;
};

export function DealCard({ deal, t, locale, favorite, loggedIn, showCity = false }: Props) {
  const scheduled = deal.effective === 'SCHEDULED';
  const location = [deal.branch.name, showCity ? cityName(deal.branch.city, locale) : null, deal.distanceKm !== null ? fmt(t.discover.distance, { km: deal.distanceKm.toFixed(1).replace('.', ',') }) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(25,45,60,.08)] ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(25,45,60,.14)]">
      <DealVisual visual={deal.visual} categorySlug={deal.categorySlug} className="h-44 p-4">
        <span className="relative inline-flex h-8 items-center rounded-full bg-white px-3 text-base font-black text-navy shadow-sm">-{deal.discountPercent}%</span>
        <div className="absolute right-4 top-4 z-10">
          <FavoriteButton dealId={deal.id} initial={favorite} loggedIn={loggedIn} labels={{ save: fmt(t.deal.saveAria, { title: deal.title }), unsave: fmt(t.deal.unsaveAria, { title: deal.title }) }} />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-navy/90 px-3 py-2 text-xs font-bold text-white backdrop-blur">
          <Clock3 className="size-3.5 text-orange-300" aria-hidden />
          {scheduled ? (
            <span>{formatMoment(parseDbTime(deal.startsAt), t, locale)}</span>
          ) : (
            <Countdown target={deal.endsAt} daysLabel={t.common.daysShort} className="tabular" />
          )}
        </div>
      </DealVisual>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] text-navy">{initials(deal.business.name)}</span>
          <span className="truncate">{deal.business.name}</span>
          <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" aria-label={t.common.verified} />
        </p>
        <h3 className="mt-3 text-lg font-black leading-snug tracking-[-.02em] text-navy">
          <a href={`/deals/${deal.slug}`} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {deal.title}
          </a>
        </h3>
        <div className="mt-3 flex flex-wrap items-end gap-x-2">
          <strong className="text-2xl font-black text-primary">{formatSum(deal.price, t)}</strong>
          {deal.originalPrice ? <span className="pb-1 text-sm text-slate-400 line-through">{formatNumber(deal.originalPrice)}</span> : null}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{location}{deal.branchCount > 1 ? ` +${deal.branchCount - 1}` : ''}</span>
          </span>
          <span className={cn('shrink-0 font-bold', deal.remaining !== null && deal.remaining <= 5 ? 'text-red-600' : 'text-amber-700')}>
            {deal.remaining === null ? t.deal.unlimited : fmt(t.deal.left, { count: deal.remaining })}
          </span>
        </div>
        <span className={cn(buttonVariants(), 'pointer-events-none mt-5 h-10 w-full rounded-xl font-bold')} aria-hidden>
          {scheduled ? t.deal.status.SCHEDULED : t.deal.viewDeal} <ArrowRight className="ml-1 size-4" />
        </span>
      </div>
    </article>
  );
}
