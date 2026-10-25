import type { Metadata } from 'next';
import { ArrowRight, Smartphone, Sparkles } from 'lucide-react';

import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { adminOverview, appUsage, automationSummary, growthStats } from '@/modules/admin/service';
import { refreshStoreDownloads, storeDownloads } from '@/modules/admin/store-stats';
import { getConfig } from '@/lib/env';
import { requireModerator } from '@/modules/auth/current';
import { getAutoModerationSettings } from '@/modules/moderation/auto';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.title, robots: { index: false, follow: false } };
}

/** Pages only an admin opens: a moderator is not shown cards that would lead to a 404. */
const ADMIN_ONLY = ['/admin/billing', '/admin/users'];

export default async function AdminOverviewPage() {
  const user = await requireModerator('/admin');
  const [{ t }, db] = await Promise.all([getI18n(), getDb()]);
  const { stores } = getConfig();
  if (user.role === 'ADMIN') await refreshStoreDownloads(db, stores);
  const [stats, automation, switches, app, growth, downloads] = await Promise.all([adminOverview(db), automationSummary(db), getAutoModerationSettings(db), appUsage(db), growthStats(db), storeDownloads(db, stores)]);
  const peak = Math.max(1, ...growth.days.flatMap((day) => [day.users, day.codes]));
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
        {cards.filter((card) => user.role === 'ADMIN' || !ADMIN_ONLY.includes(card.href)).map((card) => (
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
      {user.role === 'ADMIN' ? (
        <>
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-navy">{t.admin.growth.title}</h2>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
              <li>{fmt(t.admin.growth.newUsers, { week: growth.newUsers7, month: growth.newUsers30 })}</li>
              <li>{fmt(t.admin.growth.signedIn, { count: growth.signedIn })}</li>
              <li>{fmt(t.admin.growth.roles, { customers: growth.roles.CUSTOMER, moderators: growth.roles.MODERATOR, admins: growth.roles.ADMIN })}</li>
              <li>{fmt(t.admin.growth.objects, growth.objects)}</li>
            </ul>
            <h3 className="mt-4 text-sm font-bold text-navy">{t.admin.growth.chart}</h3>
            <div className="mt-2 flex h-28 items-end gap-1" aria-hidden>
              {growth.days.map((day) => (
                <div key={day.day} className="flex h-full flex-1 items-end gap-0.5" title={`${day.day}: ${day.users} / ${day.codes}`}>
                  <span className="w-1/2 rounded-t bg-primary" style={{ height: `${Math.max(day.users ? 4 : 0, (day.users / peak) * 100)}%` }} />
                  <span className="w-1/2 rounded-t bg-navy/60" style={{ height: `${Math.max(day.codes ? 4 : 0, (day.codes / peak) * 100)}%` }} />
                </div>
              ))}
            </div>
            <ol className="sr-only">
              {growth.days.map((day) => (
                <li key={day.day}>{`${day.day}: ${t.admin.growth.chartUsers} ${day.users}, ${t.admin.growth.chartCodes} ${day.codes}`}</li>
              ))}
            </ol>
            <p className="mt-2 flex gap-4 text-xs text-slate-500">
              <span><i className="mr-1 inline-block size-2 rounded-sm bg-primary" />{t.admin.growth.chartUsers}</span>
              <span><i className="mr-1 inline-block size-2 rounded-sm bg-navy/60" />{t.admin.growth.chartCodes}</span>
            </p>
          </section>
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-navy">{t.admin.stores.title}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([['appStore', downloads.apple], ['play', downloads.play]] as const).map(([key, store]) => (
                <div key={key} className="rounded-2xl border border-slate-200 p-4">
                  <span className="text-sm text-slate-500">{t.admin.stores[key]}</span>
                  {store ? (
                    <>
                      <strong className="mt-2 block text-3xl font-black text-navy">{store.total}</strong>
                      <p className="mt-1 text-xs text-slate-500">{fmt(t.admin.stores.periods, { week: store.last7, month: store.last30 })}</p>
                      {store.error ? <p className="mt-1 text-xs text-red-600">{fmt(t.admin.stores.error, { error: store.error })}</p> : null}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">{t.admin.stores.notSetUp}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t.admin.stores.text}</p>
            <p className="mt-1 text-sm font-bold text-navy">{t.admin.stores.sales}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
              <a href="https://appstoreconnect.apple.com/apps" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-primary hover:bg-slate-50">{t.admin.stores.appStore}</a>
              <a href="https://play.google.com/console" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-primary hover:bg-slate-50">{t.admin.stores.play}</a>
            </div>
          </section>
        </>
      ) : null}
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
