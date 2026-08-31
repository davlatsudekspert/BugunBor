import type { Metadata } from 'next';
import { CalendarClock, PackageCheck, Scissors } from 'lucide-react';

import { DealForm } from '@/components/deal-form';
import { ensureDatabase, getDb } from '@/db/runtime';

export const metadata: Metadata = {
  title: 'Yangi e’lon',
  robots: { index: false, follow: false },
};

export default async function NewDealPage() {
  await ensureDatabase();
  const db = getDb();
  const business = await db
    .prepare(
      `SELECT id, name FROM businesses WHERE deleted_at IS NULL ORDER BY CASE verification_status WHEN 'PENDING' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
    )
    .first<{ id: string; name: string }>();
  const branches = business
    ? (
        await db
          .prepare(
            'SELECT id, name FROM branches WHERE business_id = ?1 AND deleted_at IS NULL ORDER BY created_at ASC',
          )
          .bind(business.id)
          .all<{ id: string; name: string }>()
      ).results
    : [];
  const categories = (
    await db
      .prepare(
        'SELECT id, name_uz AS name FROM categories WHERE is_active = 1 ORDER BY sort_order ASC',
      )
      .all<{ id: string; name: string }>()
  ).results;

  return (
    <main className="min-h-screen bg-[#fffdf9] text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">
            Bugun<span className="text-primary">Bor</span>
          </a>
          <a
            href="/business/dashboard"
            className="text-sm font-bold text-slate-600"
          >
            ← Dashboardga qaytish
          </a>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[.75fr_1.25fr]">
        <aside>
          <span className="text-sm font-bold uppercase tracking-[.14em] text-primary">
            5 qadamda
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.05em]">
            Yangi e’lon yarating
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Mahsulot yoki xizmat — turini tanlang, narx va vaqtni belgilang.
            Moderator tekshiruvidan so‘ng, belgilangan vaqtda avtomatik
            ochiladi.
          </p>
          <div className="mt-8 space-y-4 text-sm font-semibold text-slate-700">
            <p className="flex items-center gap-3">
              <PackageCheck className="size-5 text-primary" /> Mahsulotda — aniq
              soni, kamida 2 ta rasm
            </p>
            <p className="flex items-center gap-3">
              <Scissors className="size-5 text-primary" /> Xizmatda — bo‘sh vaqt
              slotlari
            </p>
            <p className="flex items-center gap-3">
              <CalendarClock className="size-5 text-primary" /> Boshlanish
              vaqtigacha erkin tahrirlanadi
            </p>
          </div>
        </aside>
        {business ? (
          <DealForm
            businessId={business.id}
            branches={branches}
            categories={categories}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Avval{' '}
            <a href="/business/onboarding" className="font-bold text-primary">
              biznesingizni qo‘shing
            </a>
            .
          </div>
        )}
      </div>
    </main>
  );
}
