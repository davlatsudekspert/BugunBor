import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Activity, BadgeCheck, Eye, QrCode, TicketCheck } from 'lucide-react';

import { BusinessNfcStorePanel } from '@/components/business-nfcstore-panel';
import { BusinessPlanPanel } from '@/components/business-plan-panel';
import { LogoutButton } from '@/components/logout-button';
import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { BUSINESS_STATUS_LABELS } from '@/lib/business-status';
import { dealStatusLabels } from '@/lib/deal-status';
import { cn } from '@/lib/utils';
import { canAccessBusiness, type BusinessRole } from '@/modules/auth/authorization';
import { computeEffectivePlanPriceUzs } from '@/modules/billing/nfcstore-discount';
import { getServerIdentity } from '@/modules/auth/identity';
import { listOwnedBusinesses } from '@/modules/catalog/ownership';

export const metadata: Metadata = { title: 'Biznes dashboard', robots: { index: false, follow: false } };

type OwnedBusiness = {
  id: string;
  name: string;
  verificationStatus: string;
  role: string;
  nfcstoreBusinessUrl: string | null;
  nfcstoreStatus: string;
  nfcstoreDiscountEligible: number;
  planId: string;
  planCode: string;
  planName: string;
  planPriceUzs: number;
  subscriptionStatus: string;
};
type Metrics = { deals: number; activeDeals: number; redemptions: number };
type DealRow = { id: string; title: string; status: string; discountPercent: number; createdAt: string };

export default async function BusinessDashboardPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=%2Fbusiness%2Fdashboard');

  await ensurePhase1Database();
  await syncDealLifecycle();
  const db = getD1();

  // Every business this account has an active membership in — not just the most recently
  // joined one. A business owner who ended up a member of a second business (their own new
  // one, or one they were added to) must still be able to reach the first: picking only the
  // newest here is exactly what used to make an older, real business "disappear" the moment
  // a second one existed.
  const businesses = await listOwnedBusinesses(db, identity.id);
  const params = await searchParams;
  const selectedId = params.business && businesses.some((entry) => entry.id === params.business) ? params.business : businesses[0]?.id;

  const business = selectedId
    ? await db
        .prepare(`
          SELECT b.id, b.name, b.verification_status AS verificationStatus, bm.role AS role,
            b.nfcstore_business_url AS nfcstoreBusinessUrl, b.nfcstore_status AS nfcstoreStatus,
            b.nfcstore_discount_eligible AS nfcstoreDiscountEligible,
            b.plan_id AS planId, p.code AS planCode, p.name AS planName, p.price_uzs AS planPriceUzs,
            b.subscription_status AS subscriptionStatus
          FROM business_members bm
          JOIN businesses b ON b.id = bm.business_id
          LEFT JOIN plans p ON p.id = b.plan_id
          WHERE bm.user_id = ?1 AND bm.revoked_at IS NULL AND b.deleted_at IS NULL AND b.id = ?2
          LIMIT 1
        `)
        .bind(identity.id, selectedId)
        .first<OwnedBusiness>()
    : null;
  const planPrice = business ? computeEffectivePlanPriceUzs(business.planPriceUzs, Boolean(business.nfcstoreDiscountEligible)) : null;
  const canManageNfcStore = business ? canAccessBusiness({ requestedBusinessId: business.id, membershipBusinessId: business.id, role: business.role as BusinessRole, action: 'nfcstore.manage' }) : false;
  const canManagePlan = business ? canAccessBusiness({ requestedBusinessId: business.id, membershipBusinessId: business.id, role: business.role as BusinessRole, action: 'plan.manage' }) : false;

  const metrics = business
    ? await db
        .prepare(`
          SELECT COUNT(DISTINCT d.id) AS deals,
            SUM(CASE WHEN d.status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeDeals,
            COUNT(r.id) AS redemptions
          FROM deals d LEFT JOIN redemptions r ON r.deal_id = d.id
          WHERE d.business_id = ?1
        `)
        .bind(business.id)
        .first<Metrics>()
    : null;

  const recentDeals = business
    ? (await db
        .prepare(`SELECT id, title, status, discount_percent AS discountPercent, created_at AS createdAt FROM deals WHERE business_id = ?1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 8`)
        .bind(business.id)
        .all<DealRow>()).results
    : [];

  const cards = [
    { label: 'Faol aksiyalar', value: metrics?.activeDeals ?? 0, icon: Activity },
    { label: 'Jami aksiyalar', value: metrics?.deals ?? 0, icon: Eye },
    { label: 'Band qilishlar', value: metrics?.redemptions ?? 0, icon: TicketCheck },
    { label: 'NFC tashriflar', value: 0, icon: QrCode },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
          <div className="flex items-center gap-4">
            <a href="/business/onboarding" className="text-sm font-bold text-primary">+ Yangi biznes</a>
            <LogoutButton className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-60" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {businesses.length > 1 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-slate-400">Bizneslarim ({businesses.length})</span>
            {businesses.map((entry) => (
              <a
                key={entry.id}
                href={`/business/dashboard?business=${entry.id}`}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-sm font-bold transition',
                  entry.id === business?.id ? 'bg-[#152a3b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {entry.name}
              </a>
            ))}
          </div>
        ) : null}

        {business ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Biznes kabineti</p>
                <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{business.name}</h1>
              </div>
              <div className="flex items-center gap-2">
                {canAccessBusiness({ requestedBusinessId: business.id, membershipBusinessId: business.id, role: business.role as BusinessRole, action: 'redemption.validate' }) ? (
                  <a href={`/business/redemptions?business=${business.id}`} className="rounded-full bg-[#152a3b] px-4 py-2 text-sm font-bold text-white">Kodni tasdiqlash</a>
                ) : null}
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
                  <BadgeCheck className="size-4 text-emerald-600" /> {BUSINESS_STATUS_LABELS[business.verificationStatus] ?? business.verificationStatus}
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <Icon className="size-5 text-primary" />
                  <strong className="mt-7 block text-3xl font-black">{value}</strong>
                  <span className="text-sm text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            <BusinessPlanPanel
              businessId={business.id}
              planCode={business.planCode}
              planName={business.planName}
              subscriptionStatus={business.subscriptionStatus}
              planPrice={planPrice!}
              canManage={canManagePlan}
            />

            <BusinessNfcStorePanel
              businessId={business.id}
              status={business.nfcstoreStatus}
              profileUrl={business.nfcstoreBusinessUrl}
              planName={business.planName}
              planPrice={planPrice!}
              canManage={canManageNfcStore}
            />

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black">Aksiyalarim</h2>
                <div className="flex gap-2">
                  {recentDeals.length ? <a href={`/business/deals?business=${business.id}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Barchasini ko‘rish</a> : null}
                  {business.verificationStatus === 'VERIFIED' ? (
                    <a href={`/business/deals/new?business=${business.id}`} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">+ Yangi aksiya</a>
                  ) : null}
                </div>
              </div>
              {business.verificationStatus !== 'VERIFIED' ? (
                <p className="mt-2 text-slate-600">Tasdiqlash holatini kuzating — moderator profilingizni tekshirgach, aksiya qo‘sha olasiz.</p>
              ) : recentDeals.length ? (
                <ul className="mt-4 divide-y divide-slate-100">
                  {recentDeals.map((deal) => (
                    <li key={deal.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#152a3b]">{deal.title}</p>
                        <p className="text-xs text-slate-400">-{deal.discountPercent}% · {new Date(`${deal.createdAt}Z`).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{dealStatusLabels[deal.status] ?? deal.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-slate-600">Hali aksiya qo‘shilmagan. Birinchi taklifingizni joylashtiring.</p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Biznes kabineti</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Sizda hali biznes profili yo‘q</h1>
            <p className="mx-auto mt-3 max-w-md text-slate-600">Dashboardni ko‘rish uchun avval biznesingizni qo‘shing. Ariza yuborilgach, u shu yerda moderator tasdig‘ini kutadi.</p>
            <a href="/business/onboarding" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 font-bold text-white">Biznes qo‘shish</a>
          </div>
        )}
      </div>
    </main>
  );
}
