import type { Metadata } from 'next';

import { PlanEditor } from '@/components/admin/plan-editor';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireAdminPage } from '@/modules/admin/guard';

export const metadata: Metadata = { title: 'Rejalar va narxlar', robots: { index: false, follow: false } };

type PlanRow = { id: string; name: string; priceUzs: number; description: string; featuresJson: string; isActive: number };

export default async function AdminPlansPage() {
  await requireAdminPage('admin.plans.manage');
  await ensurePhase1Database();
  const plans = await getD1().prepare(`SELECT id, name, price_uzs AS priceUzs, description, features_json AS featuresJson, is_active AS isActive FROM plans ORDER BY price_uzs ASC`).all<PlanRow>();

  return (
    <main className="px-4 py-8 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Monetizatsiya</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Rejalar va narxlar</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Bepul (FREE) va Pro rejalarning nomi, narxi va imkoniyatlarini shu yerdan boshqarasiz. O‘zgarish darhol bizneslarga taqoat qiladi.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {plans.results.map((plan) => (
          <PlanEditor
            key={plan.id}
            plan={{
              id: plan.id,
              name: plan.name,
              priceUzs: plan.priceUzs,
              description: plan.description,
              features: JSON.parse(plan.featuresJson || '[]') as string[],
              isActive: Boolean(plan.isActive),
            }}
          />
        ))}
      </div>
    </main>
  );
}
