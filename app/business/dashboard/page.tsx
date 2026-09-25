import type { Metadata } from 'next';
import { Activity, BellRing, Clock3, Eye, Plus, Printer, QrCode, Star, TicketCheck } from 'lucide-react';

import { WorkspaceShell } from '@/components/business/workspace-shell';
import { RatingStars, ratingText } from '@/components/deals/rating-stars';
import { formatMoment } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { formatNumericDate, parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { roleCan } from '@/modules/auth/authorization';
import { requireWorkspace } from '@/modules/businesses/current';
import { businessDashboard } from '@/modules/businesses/service';
import { listBusinessReviews } from '@/modules/engagement/reviews';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.title, robots: { index: false, follow: false } };
}

const statusTone: Record<string, string> = {
  CLAIMED: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-sky-50 text-sky-700',
  EXPIRED: 'bg-slate-100 text-slate-600',
  CANCELED: 'bg-slate-100 text-slate-600',
};

export default async function BusinessDashboardPage() {
  const ws = await requireWorkspace('/business/dashboard', 'analytics.read');
  const { t, locale, db, membership, subscription } = ws;
  const [data, reviews] = await Promise.all([businessDashboard(db, membership.businessId), listBusinessReviews(db, membership.businessId, 5)]);
  const planName = subscription.plan ? (locale === 'ru' ? subscription.plan.nameRu : subscription.plan.nameUz) : '';
  const cards = [
    { label: t.biz.dashboard.stats.live, value: data.live, icon: Activity },
    { label: t.biz.dashboard.stats.claimsToday, value: data.claimsToday, icon: TicketCheck },
    { label: t.biz.dashboard.stats.redeemedToday, value: data.redeemedToday, icon: QrCode },
    { label: t.biz.dashboard.stats.views, value: data.views, icon: Eye },
    { label: t.biz.dashboard.stats.followers, value: data.followers, icon: BellRing },
    { label: data.reviewCount ? `${t.biz.dashboard.stats.rating} · ${fmt(t.business.ratingCount, { count: data.reviewCount })}` : t.biz.dashboard.stats.noRating, value: data.reviewCount ? `★ ${ratingText(data.ratingBp)}` : '—', icon: Star },
  ];

  return (
    <WorkspaceShell ws={ws} active="dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Icon className="size-5 text-primary" aria-hidden />
            <strong className="mt-6 block text-3xl font-black text-navy">{value}</strong>
            <span className="text-sm text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-navy">{t.biz.dashboard.recent}</h2>
          {data.recent.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.recent.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-navy">{row.dealTitle}</p>
                    <p className="truncate text-xs text-slate-500">{row.customerName} · {row.branchName} · {formatMoment(parseDbTime(row.completedAt ?? row.createdAt), t, locale)}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', statusTone[row.status] ?? statusTone.EXPIRED)}>{t.codes.status[row.status as keyof typeof t.codes.status] ?? row.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{t.biz.dashboard.recentEmpty}</p>
          )}
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-navy">{t.biz.dashboard.quick}</h2>
            <div className="mt-4 grid gap-2">
              <a href="/business/redeem" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white"><QrCode className="size-5" aria-hidden /> {t.biz.dashboard.redeem}</a>
              {roleCan(membership.role, 'deal.write') ? (
                <a href="/business/deals/new" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 font-bold text-navy hover:border-primary/40"><Plus className="size-5" aria-hidden /> {t.biz.dashboard.newDeal}</a>
              ) : null}
              {membership.verificationStatus === 'VERIFIED' ? (
                <a href="/business/poster" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 font-bold text-navy hover:border-primary/40"><Printer className="size-5" aria-hidden /> {t.biz.poster.open}</a>
              ) : null}
            </div>
            {data.pending ? <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-700"><Clock3 className="size-4" aria-hidden /> {t.biz.dashboard.stats.pending}: {data.pending}</p> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-navy">{t.biz.dashboard.reviewsTitle}</h2>
            {reviews.length ? (
              <ul className="mt-3 space-y-3">
                {reviews.map((review) => (
                  <li key={review.id} className="text-sm">
                    <RatingStars value={review.rating} className="[&>svg]:size-3.5" />
                    {review.comment ? <p className="mt-1 text-slate-700">{review.comment}</p> : null}
                    <p className="mt-0.5 text-xs text-slate-500">{review.author ?? '—'} · {review.dealTitle}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t.biz.dashboard.reviewsEmpty}</p>
            )}
          </section>

          <section className="rounded-2xl bg-navy p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[.14em] text-orange-200">{t.billing.status[subscription.status]}</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {subscription.status === 'TRIAL'
                ? fmt(t.billing.trialText, { plan: planName, date: formatNumericDate(parseDbTime(subscription.endsAt!)) })
                : subscription.status === 'ACTIVE'
                  ? fmt(t.billing.activeText, { plan: planName, date: formatNumericDate(parseDbTime(subscription.endsAt!)) })
                  : subscription.status === 'EXPIRED'
                    ? t.billing.expiredText
                    : t.billing.chipPending}
            </p>
            {roleCan(membership.role, 'business.edit') ? <a href="/business/billing" className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-bold text-navy">{t.billing.choosePlan}</a> : null}
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
