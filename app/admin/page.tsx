import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { getI18n } from '@/lib/i18n/server';
import { adminOverview } from '@/modules/admin/service';
import { requireModerator } from '@/modules/auth/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.title, robots: { index: false, follow: false } };
}

export default async function AdminOverviewPage() {
  const user = await requireModerator('/admin');
  const [{ t }, db] = await Promise.all([getI18n(), getDb()]);
  const stats = await adminOverview(db);
  const cards = [
    { label: t.admin.stats.pendingBusinesses, value: stats.pendingBusinesses, href: '/admin/businesses', urgent: stats.pendingBusinesses > 0 },
    { label: t.admin.stats.pendingDeals, value: stats.pendingDeals, href: '/admin/deals', urgent: stats.pendingDeals > 0 },
    { label: t.admin.billing.requests, value: stats.pendingPayments, href: '/admin/billing', urgent: stats.pendingPayments > 0 },
    { label: t.admin.stats.newMessages, value: stats.newMessages, href: '/admin/messages', urgent: stats.newMessages > 0 },
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
    </AdminShell>
  );
}
