import type { Metadata } from 'next';
import { ArrowRight, Smartphone, Sparkles } from 'lucide-react';

import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { adminOverview, appUsage, automationSummary } from '@/modules/admin/service';
import { requireModerator } from '@/modules/auth/current';
import { getAutoModerationSettings } from '@/modules/moderation/auto';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.title, robots: { index: false, follow: false } };
}

export default async function AdminOverviewPage() {
  const user = await requireModerator('/admin');
  const [{ t }, db] = await Promise.all([getI18n(), getDb()]);
  const [stats, automation, switches, app] = await Promise.all([adminOverview(db), automationSummary(db), getAutoModerationSettings(db), appUsage(db)]);
  const auto = t.admin.auto;
  const cards = [
    { label: t.admin.stats.pendingBusinesses, value: stats.pendingBusinesses, href: '/admin/businesses', urgent: stats.pendingBusinesses > 0 },
    { label: t.admin.stats.pendingDeals, value: stats.pendingDeals, href: '/admin/deals', urgent: stats.pendingDeals > 0 },
    { label: t.admin.billing.requests, value: stats.pendingPayments, href: '/admin/billing', urgent: stats.pendingPayments > 0 },
    { label: t.admin.stats.newMessages, value: stats.newMessages, href: '/admin/messages', urgent: stats.newMessages > 0 },
    { label: t.reports.title, value: app.openReports, href: '/admin/reports', urgent: app.openReports > 0 },
    { label: t.admin.stats.liveDeals, value: stats.liveDeals, href: '/admin/deals?f=live', urgent: false },
    { label: t.admin.stats.users, value: stats.users, href: '/admin/users', urgent: false },
    { label: t.admin.stats.claimsToday, value: stats.claimsToday, href: '/admin/audit', urgent: false },
    { label: t.admin.stats.redeemedToday, value: stats.redeemedToday, href: '/admin/audit', urgent: false },
  ];
  return (
    <AdminShell t={t} role={user.role} active="overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <a key={card.label} href={card.href} className={`group rounded-2xl border bg-white p-5 transition hover:shadow-md ${card.urgent ? 'border-primary/50' : 'border-slate-200'}`}>
            <span className="text-sm text-slate-500">{card.label}</span>
            <strong className={`mt-4 block text-3xl font-black ${card.urgent ? 'text-primary' : 'text-navy'}`}>{card.value}</strong>
            <ArrowRight className="mt-2 size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
          </a>
        ))}
      </div>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><Smartphone className="size-5 text-primary" aria-hidden /> {t.admin.app.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{fmt(t.admin.app.summary, { users: app.activeUsers, devices: app.devices, build: app.latestBuild ?? '—' })}</p>
      </section>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><Sparkles className="size-5 text-primary" aria-hidden /> {auto.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{fmt(auto.summary, automation)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
          {(['businesses', 'deals', 'reviews'] as const).map((key) => (
            <span key={key} className={cn('rounded-full px-2.5 py-1', switches[key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{auto[key]}: {switches[key] ? auto.on : auto.off}</span>
          ))}
          {user.role === 'ADMIN' ? <a href="/admin/settings#automation" className="ml-1 text-primary underline-offset-2 hover:underline">{t.admin.nav.settings}</a> : null}
        </div>
      </section>
    </AdminShell>
  );
}
