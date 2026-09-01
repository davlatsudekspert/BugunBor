import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BusinessActions } from '@/components/admin/business-actions';
import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { canAdmin } from '@/modules/admin/authorization';
import { requireAdminPage } from '@/modules/admin/guard';

export const metadata: Metadata = { title: 'Bizneslar', robots: { index: false, follow: false } };

type BusinessRow = {
  id: string;
  name: string;
  city: string;
  verificationStatus: string;
  planId: string;
  planName: string;
  subscriptionStatus: string;
  createdAt: string;
};

type ActiveDealRow = { id: string; businessId: string; title: string; isSponsored: number };

export default async function AdminBusinessesPage() {
  const admin = await requireAdminPage();
  const canManage = canAdmin(admin.role, 'admin.businesses.manage');
  const canManagePlan = canAdmin(admin.role, 'admin.plans.manage') || canManage;
  if (!canManage && !canManagePlan) redirect('/admin');

  await ensurePhase1Database();
  await syncDealLifecycle();
  const db = getD1();
  const [businesses, plans, activeDeals] = await Promise.all([
    db
      .prepare(`SELECT b.id, b.name, b.city, b.verification_status AS verificationStatus, b.plan_id AS planId, p.name AS planName, b.subscription_status AS subscriptionStatus, b.created_at AS createdAt
        FROM businesses b LEFT JOIN plans p ON p.id = b.plan_id
        WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC LIMIT 100`)
      .all<BusinessRow>(),
    db.prepare(`SELECT id, name FROM plans WHERE is_active = 1 ORDER BY price_uzs ASC`).all<{ id: string; name: string }>(),
    db.prepare(`SELECT id, business_id AS businessId, title, is_sponsored AS isSponsored FROM deals WHERE status = 'ACTIVE' AND deleted_at IS NULL ORDER BY created_at DESC`).all<ActiveDealRow>(),
  ]);

  const dealsByBusiness = new Map<string, ActiveDealRow[]>();
  for (const deal of activeDeals.results) {
    const list = dealsByBusiness.get(deal.businessId) ?? [];
    list.push(deal);
    dealsByBusiness.set(deal.businessId, list);
  }

  return (
    <main className="px-4 py-8 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Tenantlar</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Bizneslar</h1>
      <p className="mt-3 text-slate-600">Tasdiqlash, to‘xtatish va reja biriktirish shu yerdan boshqariladi. Har bir qaror audit jurnaliga yoziladi.</p>

      <div className="mt-8 space-y-3">
        {businesses.results.length ? (
          businesses.results.map((business) => (
            <BusinessActions
              key={business.id}
              business={business}
              plans={plans.results}
              canManage={canManage}
              canManagePlan={canManagePlan}
              activeDeals={dealsByBusiness.get(business.id) ?? []}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">Hozircha biznes yo‘q.</p>
        )}
      </div>
    </main>
  );
}
