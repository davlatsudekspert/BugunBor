import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import { RedemptionValidator } from '@/components/redemption-validator';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getOwnedBusiness } from '@/modules/catalog/ownership';
import { getServerIdentity } from '@/modules/auth/identity';

export const metadata: Metadata = { title: 'Kodni tasdiqlash', robots: { index: false, follow: false } };

export default async function BusinessRedemptionsPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=%2Fbusiness%2Fredemptions');

  await ensurePhase1Database();
  const business = await getOwnedBusiness(getD1(), identity.id, 'redemption.validate');

  return (
    <main className="min-h-screen bg-slate-50 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
          <a href="/business/dashboard" className="text-sm font-bold text-slate-500">← Dashboard</a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Filialda</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Bron kodini tasdiqlash</h1>
        <p className="mt-3 text-slate-600">Mijoz telefonida ko‘rsatgan kodni kiriting. Har bir kod faqat bir marta ishlaydi.</p>

        {business ? (
          <div className="mt-8">
            <RedemptionValidator />
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
