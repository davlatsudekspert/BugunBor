import type { Metadata } from 'next';
import { Crown, Plus } from 'lucide-react';

import { DealActions } from '@/components/business/deal-actions';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { DealVisual } from '@/components/deals/deal-visual';
import { formatMoment, formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { requireWorkspace } from '@/modules/businesses/current';
import { listBusinessDeals, type BusinessDealRow } from '@/modules/deals/service';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.deals.title, robots: { index: false, follow: false } };
}

type Filter = 'all' | 'live' | 'review' | 'draft' | 'ended';
const FILTERS: Filter[] = ['all', 'live', 'review', 'draft', 'ended'];

function matches(deal: BusinessDealRow, filter: Filter) {
  switch (filter) {
    case 'live':
      return ['LIVE', 'SCHEDULED', 'SOLD_OUT', 'PAUSED'].includes(deal.effective);
    case 'review':
      return deal.effective === 'PENDING_REVIEW';
    case 'draft':
      return deal.effective === 'DRAFT' || deal.effective === 'REJECTED';
    case 'ended':
      return deal.effective === 'ARCHIVED' || deal.effective === 'EXPIRED';
    default:
      return true;
  }
}

const tone: Record<string, string> = {
  LIVE: 'bg-emerald-50 text-emerald-700',
  SCHEDULED: 'bg-sky-50 text-sky-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  REJECTED: 'bg-red-50 text-red-700',
  PAUSED: 'bg-slate-100 text-slate-700',
};

export default async function BusinessDealsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const ws = await requireWorkspace('/business/deals', 'deal.write');
  const { t, locale, db, membership } = ws;
  const filter: Filter = FILTERS.includes(f as Filter) ? (f as Filter) : 'all';
  const deals = await listBusinessDeals(db, membership.businessId);
  const visible = deals.filter((deal) => matches(deal, filter));
  const d = t.biz.deals;

  return (
    <WorkspaceShell ws={ws} active="deals">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{d.title}</h2>
        <a href="/business/deals/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-white"><Plus className="size-5" aria-hidden /> {d.new}</a>
      </div>
      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((key) => {
          const count = deals.filter((deal) => matches(deal, key)).length;
          return (
            <a key={key} href={key === 'all' ? '/business/deals' : `/business/deals?f=${key}`} aria-current={filter === key ? 'true' : undefined} className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-bold', filter === key ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600')}>
              {d.filters[key]} <span className="opacity-70">{count}</span>
            </a>
          );
        })}
      </div>

      {visible.length ? (
        <ul className="mt-5 space-y-3">
          {visible.map((deal) => (
            <li key={deal.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex gap-4">
                <DealVisual visual={deal.visual} categorySlug={deal.categorySlug} photo={deal.photo} className="hidden size-20 shrink-0 rounded-xl sm:block" emojiClassName="-bottom-3 -right-2 text-5xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', tone[deal.effective] ?? 'bg-slate-100 text-slate-600')}>{t.deal.status[deal.effective]}</span>
                    {deal.isSponsored ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800"><Crown className="size-3.5" aria-hidden /> TOP</span> : null}
                    <span className="text-xs text-slate-500">{fmt(d.window, { from: formatMoment(parseDbTime(deal.startsAt), t, locale), to: formatMoment(parseDbTime(deal.endsAt), t, locale) })}</span>
                  </div>
                  <p className="mt-1.5 truncate text-lg font-black text-navy">{deal.title}</p>
                  <p className="mt-0.5 text-sm"><strong className="text-primary">{formatSum(deal.price, t)}</strong> <span className="text-slate-400">−{deal.discountPercent}%</span></p>
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div className="flex gap-1"><dt>{d.stock}:</dt><dd className="font-bold text-navy">{deal.remaining === null ? t.deal.unlimited : `${deal.remaining}/${deal.total}`}</dd></div>
                    <div className="flex gap-1"><dt>{d.claims}:</dt><dd className="font-bold text-navy">{deal.claims}</dd></div>
                    <div className="flex gap-1"><dt>{d.redeemed}:</dt><dd className="font-bold text-navy">{deal.redeemed}</dd></div>
                    <div className="flex gap-1"><dt>{d.views}:</dt><dd className="font-bold text-navy">{deal.viewCount}</dd></div>
                  </dl>
                  {deal.status === 'REJECTED' && deal.rejectionReason ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{fmt(d.rejectedReason, { reason: deal.rejectionReason })}</p> : null}
                  <div className="mt-3">
                    <DealActions
                      businessId={membership.businessId}
                      dealId={deal.id}
                      slug={deal.slug}
                      status={deal.status}
                      isSponsored={deal.isSponsored}
                      labels={{ ...d.actions, confirmEnd: d.confirmEnd, confirmDelete: d.confirmDelete, topOn: t.billing.topOn, topOff: t.billing.topOff, networkError: t.common.networkError }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{d.empty}</p>
      )}
      <p className="mt-4 text-xs text-slate-500">{t.billing.topHint}</p>
    </WorkspaceShell>
  );
}
