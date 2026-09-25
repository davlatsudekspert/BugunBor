import { BadgeCheck, Clock3, CreditCard, ExternalLink, LayoutDashboard, MapPin, QrCode, Store, Tag, TriangleAlert, Users } from 'lucide-react';

import { fmt } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { roleCan, type BusinessAction } from '@/modules/auth/authorization';
import type { Workspace } from '@/modules/businesses/current';

export type WorkspaceTab = 'dashboard' | 'redeem' | 'deals' | 'branches' | 'team' | 'profile' | 'billing';

const tabs: Array<{ key: WorkspaceTab; href: string; action: BusinessAction; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', href: '/business/dashboard', action: 'analytics.read', icon: LayoutDashboard },
  { key: 'redeem', href: '/business/redeem', action: 'redemption.validate', icon: QrCode },
  { key: 'deals', href: '/business/deals', action: 'deal.write', icon: Tag },
  { key: 'branches', href: '/business/branches', action: 'branch.write', icon: MapPin },
  { key: 'team', href: '/business/team', action: 'team.manage', icon: Users },
  { key: 'profile', href: '/business/profile', action: 'business.edit', icon: Store },
  { key: 'billing', href: '/business/billing', action: 'business.edit', icon: CreditCard },
];

export function WorkspaceShell({ ws, active, children }: { ws: Workspace; active: WorkspaceTab; children: React.ReactNode }) {
  const { t, locale, membership, memberships, subscription } = ws;
  const planName = subscription.plan ? (locale === 'ru' ? subscription.plan.nameRu : subscription.plan.nameUz) : '';
  const chip =
    subscription.status === 'TRIAL'
      ? { text: fmt(t.billing.chipTrial, { days: subscription.daysLeft }), tone: 'bg-emerald-50 text-emerald-700' }
      : subscription.status === 'ACTIVE'
        ? { text: fmt(t.billing.chipActive, { plan: planName, days: subscription.daysLeft }), tone: 'bg-sky-50 text-sky-700' }
        : subscription.status === 'EXPIRED'
          ? { text: t.billing.chipExpired, tone: 'bg-red-50 text-red-700' }
          : { text: t.billing.chipPending, tone: 'bg-slate-100 text-slate-600' };
  const canBill = roleCan(membership.role, 'business.edit');

  return (
    <main className="min-h-[70vh] bg-slate-50/60 pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[.14em] text-primary">{t.biz.title}</p>
              <h1 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-black tracking-[-.04em] text-navy">
                <span className="truncate">{membership.name}</span>
                {membership.verificationStatus === 'VERIFIED' ? <BadgeCheck className="size-6 fill-emerald-500 text-white" aria-label={t.common.verified} /> : null}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{fmt(t.biz.roleLabel, { role: t.biz.team.roles[membership.role] })}</span>
                <span className={cn('rounded-full px-2.5 py-1', chip.tone)}>{chip.text}</span>
                {membership.isDemo ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{t.common.demo}</span> : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {membership.verificationStatus === 'VERIFIED' ? (
                <a href={`/businesses/${membership.slug}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-navy hover:border-primary/40">
                  <ExternalLink className="size-4" aria-hidden /> {t.biz.viewPublic}
                </a>
              ) : null}
              {memberships.length > 1 ? (
                <details className="relative">
                  <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-xl border border-slate-200 px-3 text-sm font-bold text-navy hover:border-primary/40 [&::-webkit-details-marker]:hidden">{t.biz.switcher}</summary>
                  <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {memberships.map((item) => (
                      <a key={item.businessId} href={`/business/switch/${item.businessId}?next=${encodeURIComponent(tabs.find((tab) => tab.key === active)?.href ?? '/business/dashboard')}`} className={cn('block truncate px-4 py-3 text-sm font-semibold hover:bg-slate-50', item.businessId === membership.businessId ? 'text-primary' : 'text-navy')}>
                        {item.name}
                      </a>
                    ))}
                    <a href="/business/onboarding" className="block border-t border-slate-100 px-4 py-3 text-sm font-bold text-primary hover:bg-slate-50">+ {t.biz.addAnother}</a>
                  </div>
                </details>
              ) : null}
            </div>
          </div>
          <nav className="scrollbar-none -mx-4 mt-5 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={t.biz.title}>
            {tabs.filter((tab) => roleCan(membership.role, tab.action)).map(({ key, href, icon: Icon }) => (
              <a key={key} href={href} aria-current={active === key ? 'page' : undefined} className={cn('inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition', active === key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-navy')}>
                <Icon className="size-4" aria-hidden /> {t.biz.nav[key]}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-3 px-4 pt-5 sm:px-6">
        {membership.suspendedAt ? (
          <Banner tone="red">{fmt(t.biz.banner.SUSPENDED, { reason: membership.suspendedReason ?? '' })}</Banner>
        ) : null}
        {membership.verificationStatus === 'PENDING' ? <Banner tone="amber">{t.biz.banner.PENDING}</Banner> : null}
        {membership.verificationStatus === 'REJECTED' ? (
          <Banner tone="red">
            {fmt(t.biz.banner.REJECTED, { reason: membership.rejectionReason ?? '' })}{' '}
            {canBill ? <a href="/business/profile" className="font-black underline">{t.biz.banner.REJECTED_ACTION}</a> : null}
          </Banner>
        ) : null}
        {subscription.status === 'EXPIRED' ? (
          <Banner tone="red">
            {t.billing.expiredBanner} {canBill ? <a href="/business/billing" className="font-black underline">{t.billing.choosePlan}</a> : null}
          </Banner>
        ) : null}
        {subscription.status === 'TRIAL' && subscription.daysLeft <= 14 && canBill ? (
          <Banner tone="amber">
            {fmt(t.billing.trialEnding, { days: subscription.daysLeft })} <a href="/business/billing" className="font-black underline">{t.billing.choosePlan}</a>
          </Banner>
        ) : null}
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">{children}</div>
    </main>
  );
}

function Banner({ tone, children }: { tone: 'red' | 'amber'; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold', tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800')}>
      {tone === 'red' ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <p>{children}</p>
    </div>
  );
}
