import type { Metadata } from 'next';
import { Activity, BadgeCheck, Clock3, ShoppingBag, TicketCheck, Wallet } from 'lucide-react';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireAdminPage } from '@/modules/admin/guard';
import { canAdmin } from '@/modules/admin/authorization';

export const metadata: Metadata = { title: 'Boshqaruv paneli', robots: { index: false, follow: false } };

const formatUzs = (value: number) => new Intl.NumberFormat('uz-UZ').format(value);

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage('admin.dashboard.read');
  await ensurePhase1Database();
  const db = getD1();

  const [businessCounts, dealCounts, redemptions30d, mrr, recentAudit] = await Promise.all([
    db.prepare(`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN verification_status = 'VERIFIED' THEN 1 ELSE 0 END) AS verified
      FROM businesses WHERE deleted_at IS NULL`).first<{ total: number; pending: number; verified: number }>(),
    db.prepare(`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) AS pendingReview
      FROM deals WHERE deleted_at IS NULL`).first<{ total: number; active: number; pendingReview: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM redemptions WHERE datetime(created_at) > datetime('now', '-30 days')`).first<{ count: number }>(),
    db.prepare(`SELECT p.name, p.price_uzs AS priceUzs, COUNT(b.id) AS businesses
      FROM plans p LEFT JOIN businesses b ON b.plan_id = p.id AND b.subscription_status = 'ACTIVE' AND b.deleted_at IS NULL
      WHERE p.is_active = 1 GROUP BY p.id ORDER BY p.price_uzs DESC`).all<{ name: string; priceUzs: number; businesses: number }>(),
    db.prepare(`SELECT action, target_type AS targetType, reason, created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 8`).all<{ action: string; targetType: string; reason: string | null; createdAt: string }>(),
  ]);

  const monthlyRevenue = mrr.results.reduce((sum, row) => sum + row.priceUzs * row.businesses, 0);
  const cards = [
    { label: 'Bizneslar', value: businessCounts?.total ?? 0, hint: `${businessCounts?.pending ?? 0} tasdiqlash kutmoqda`, icon: ShoppingBag },
    { label: 'Faol aksiyalar', value: dealCounts?.active ?? 0, hint: `${dealCounts?.pendingReview ?? 0} moderatsiyada`, icon: Activity },
    { label: 'Band qilishlar (30 kun)', value: redemptions30d?.count ?? 0, hint: 'Oxirgi 30 kunda', icon: TicketCheck },
    { label: 'Taxminiy oylik daromad', value: `${formatUzs(monthlyRevenue)} so‘m`, hint: 'Faol Pro obunalardan', icon: Wallet },
  ];

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Xush kelibsiz</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">{admin.displayName}</h1>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Icon className="size-5 text-primary" />
            <strong className="mt-6 block text-2xl font-black">{value}</strong>
            <span className="text-sm text-slate-500">{label}</span>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </div>

      {canAdmin(admin.role, 'admin.plans.manage') ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-black"><Wallet className="size-5 text-primary" /> Rejalar bo‘yicha bizneslar</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mrr.results.map((plan) => (
              <div key={plan.name} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-500">{plan.name}</p>
                <p className="mt-1 text-2xl font-black">{plan.businesses} <span className="text-sm font-semibold text-slate-400">biznes</span></p>
                <p className="mt-1 text-xs text-slate-500">{formatUzs(plan.priceUzs)} so‘m/oy</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-black"><Clock3 className="size-5 text-primary" /> So‘nggi harakatlar</h2>
        {recentAudit.results.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {recentAudit.results.map((entry, index) => (
              <li key={index} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#152a3b]">{entry.action}</p>
                  {entry.reason ? <p className="truncate text-slate-500">{entry.reason}</p> : null}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                  <BadgeCheck className="size-3.5" /> {entry.targetType}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Hozircha yozuv yo‘q.</p>
        )}
      </div>
    </main>
  );
}
