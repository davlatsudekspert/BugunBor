import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import { OfflineSaleAdjuster } from '@/components/offline-sale-adjuster';
import { RedemptionValidator } from '@/components/redemption-validator';
import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { getOwnedBusiness } from '@/modules/catalog/ownership';
import { getServerIdentity } from '@/modules/auth/identity';

export const metadata: Metadata = { title: 'Kodni tasdiqlash', robots: { index: false, follow: false } };

type ActiveDeal = { id: string; title: string; remainingQuantity: number | null };

export default async function BusinessRedemptionsPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=%2Fbusiness%2Fredemptions');

  await ensurePhase1Database();
  await syncDealLifecycle();
  const db = getD1();
  const params = await searchParams;
  // ?business= lets an owner of more than one business pick which one's deals show in the
  // offline-sale dropdown below — omitting it falls back to the newest membership, same as
  // before, so a single-business owner sees no change. The code validator itself already
  // resolves its business from the scanned code, not from this page, so it needs no such param.
  const business = await getOwnedBusiness(db, identity.id, 'redemption.validate', params.business);

  const activeDeals = business
    ? (await db
        .prepare(`SELECT id, title, remaining_quantity AS remainingQuantity FROM deals WHERE business_id = ?1 AND status = 'ACTIVE' AND deleted_at IS NULL AND remaining_quantity IS NOT NULL ORDER BY created_at DESC`)
        .bind(business.id)
        .all<ActiveDeal>()).results
    : [];

  return (
    <main className="min-h-screen bg-slate-50 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
          <a href={business ? `/business/dashboard?business=${business.id}` : '/business/dashboard'} className="text-sm font-bold text-slate-500">← Dashboard</a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Filialda</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Bron kodini tasdiqlash</h1>
        <p className="mt-3 text-slate-600">Mijoz telefonida ko‘rsatgan kodni kiriting. Har bir kod faqat bir marta ishlaydi.</p>

        {business ? (
          <div className="mt-8 space-y-8">
            <RedemptionValidator />

            <div>
              <h2 className="text-xl font-black">Filialda to‘g‘ridan-to‘g‘ri sotildimi?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Agar mahsulotni onlayn tizimsiz, to‘g‘ridan-to‘g‘ri mijozga sotgan bo‘lsangiz, shu yerdan belgilang — aks holda onlayn miqdor noto‘g‘ri qolib, boshqa mijoz allaqachon tugagan taklifni band qilib qo‘yishi mumkin.
              </p>
              <div className="mt-4">
                <OfflineSaleAdjuster deals={activeDeals} />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-500" />
            <h2 className="mt-4 text-xl font-black">Ruxsat yo‘q</h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-600">Kodlarni tasdiqlash uchun biznesda tegishli rolga (egasi, menejer yoki kassir) ega bo‘lishingiz kerak.</p>
          </div>
        )}
      </div>
    </main>
  );
}
