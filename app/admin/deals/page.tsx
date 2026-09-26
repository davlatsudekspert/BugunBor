import type { Metadata } from 'next';

import { ActionButton, DecisionForm } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { DealVisual } from '@/components/deals/deal-visual';
import { getDb } from '@/db/client';
import { formatDurationMinutes, formatMoment, formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { listAdminDeals } from '@/modules/admin/service';
import { requireModerator } from '@/modules/auth/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.deals.title, robots: { index: false, follow: false } };
}

type Filter = 'pending' | 'live' | 'all';

export default async function AdminDealsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const user = await requireModerator('/admin/deals');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const filter: Filter = f === 'live' || f === 'all' ? f : 'pending';
  const deals = await listAdminDeals(db, filter);
  const a = t.admin;
  const labels: Record<Filter, string> = { pending: a.filters.pending, live: t.biz.deals.filters.live, all: a.filters.all };

  return (
    <AdminShell t={t} role={user.role} active="deals">
      <div className="flex gap-2">
        {(['pending', 'live', 'all'] as const).map((key) => (
          <a key={key} href={key === 'pending' ? '/admin/deals' : `/admin/deals?f=${key}`} className={cn('inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold', filter === key ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600')}>{labels[key]}</a>
        ))}
      </div>
      {deals.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {deals.map((deal) => (
            <article key={deal.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex gap-4">
                <DealVisual visual={deal.visual} categorySlug={deal.categorySlug} photo={deal.photo} sizes="80px" className="size-20 shrink-0 rounded-xl" emojiClassName="-bottom-3 -right-2 text-5xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-500">{deal.businessName} · {deal.categoryName}{deal.isDemo ? ` · ${t.common.demo}` : ''}</p>
                  <p className="mt-1 text-lg font-black leading-snug text-navy">{deal.title}</p>
                  <p className="mt-1 text-sm"><strong className="text-primary">{formatSum(deal.price, t)}</strong> {deal.originalPrice ? <span className="text-slate-400 line-through">{formatSum(deal.originalPrice, t)}</span> : null} <span className="font-bold text-emerald-700">−{deal.discountPercent}%</span></p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{deal.description}</p>
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{deal.terms}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-slate-400">{t.deal.startsAt}</dt><dd className="font-semibold text-navy">{formatMoment(parseDbTime(deal.startsAt), t, locale)}</dd></div>
                <div><dt className="text-slate-400">{t.deal.endsAt}</dt><dd className="font-semibold text-navy">{formatMoment(parseDbTime(deal.endsAt), t, locale)}</dd></div>
                <div><dt className="text-slate-400">{t.biz.deals.stock}</dt><dd className="font-semibold text-navy">{deal.total === null ? t.deal.unlimited : `${deal.remaining}/${deal.total}`} · {fmt(t.deal.perCustomer, { count: deal.perCustomerLimit })}</dd></div>
                <div><dt className="text-slate-400">{t.biz.dealForm.ttl}</dt><dd className="font-semibold text-navy">{formatDurationMinutes(deal.claimTtlMinutes, t)}</dd></div>
                <div className="col-span-2"><dt className="text-slate-400">{t.deal.branches}</dt><dd className="font-semibold text-navy">{deal.branchNames ?? '—'}</dd></div>
              </dl>
              {deal.status === 'PENDING_REVIEW' ? (
                <>
                  {deal.businessStatus !== 'VERIFIED' ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{a.deals.businessNotVerified}</p> : null}
                  <DecisionForm kind="deal" targetId={deal.id} labels={{ approve: a.approve, reject: a.reject, reason: a.reason, placeholder: a.reasonPlaceholder, hint: a.reasonHint, networkError: t.common.networkError }} />
                </>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{t.deal.status[(deal.status === 'ACTIVE' ? 'LIVE' : deal.status) as keyof typeof t.deal.status] ?? deal.status}</span>
                  <a href={`/deals/${deal.slug}`} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-navy">{t.biz.deals.actions.view}</a>
                  {deal.ownPhoto ? (
                    <ActionButton payload={{ type: 'images.remove', target: 'DEAL', id: deal.id }} label={a.removePhoto} reasonPrompt={a.removeImagesReason} tone="danger" networkError={t.common.networkError} />
                  ) : null}
                  {deal.status === 'ACTIVE' || deal.status === 'PAUSED' ? (
                    <ActionButton payload={{ type: 'deal.archive', dealId: deal.id }} label={a.deals.archive} reasonPrompt={a.reasonHint} tone="danger" networkError={t.common.networkError} />
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{a.queueEmpty}</p>
      )}
    </AdminShell>
  );
}
