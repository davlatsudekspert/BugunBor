import type { Metadata } from 'next';

import { ModerationCard } from '@/components/moderation-card';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireAdminPage } from '@/modules/admin/guard';

export const metadata: Metadata = { title: 'Aksiyalar moderatsiyasi', robots: { index: false, follow: false } };

export default async function AdminDealsModerationPage() {
  await requireAdminPage('admin.deals.moderate');
  await ensurePhase1Database();
  const result = await getD1()
    .prepare(`SELECT d.id, d.title, d.description, b.name AS businessName FROM deals d JOIN businesses b ON b.id = d.business_id WHERE d.status = 'PENDING_REVIEW' ORDER BY d.created_at ASC LIMIT 30`)
    .all<{ id: string; title: string; description: string; businessName: string }>();

  return (
    <main className="px-4 py-8 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Ish navbati</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Aksiyalar moderatsiyasi</h1>
      <p className="mt-3 text-slate-600">Har bir qaror sabab bilan yoziladi va audit jurnaliga qo‘shiladi.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {result.results.length
          ? result.results.map((deal) => <ModerationCard key={deal.id} {...deal} />)
          : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500 md:col-span-2">Tekshiruv navbati bo‘sh.</p>}
      </div>
    </main>
  );
}
