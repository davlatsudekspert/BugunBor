import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

import { ModerationCard } from '@/components/moderation-card';
import { ensureDatabase, getDb } from '@/db/runtime';

export const metadata: Metadata = {
  title: 'Aksiyalar moderatsiyasi',
  robots: { index: false, follow: false },
};

export default async function ModerationQueuePage() {
  await ensureDatabase();
  const result = await getDb()
    .prepare(
      `SELECT d.id, d.title, d.description, b.name AS "businessName" FROM deals d JOIN businesses b ON b.id = d.business_id WHERE d.status = 'PENDING_REVIEW' ORDER BY d.created_at ASC LIMIT 30`,
    )
    .all<{
      id: string;
      title: string;
      description: string;
      businessName: string;
    }>();
  return (
    <main className="min-h-screen bg-slate-50 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">
            Bugun<span className="text-primary">Bor</span>
          </a>
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="size-4 text-emerald-600" /> Moderator paneli
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">
          Ish navbati
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">
          Aksiyalar moderatsiyasi
        </h1>
        <p className="mt-3 text-slate-600">
          Har bir qaror sabab bilan yoziladi va audit jurnaliga qo‘shiladi.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.results.length ? (
            result.results.map((deal) => (
              <ModerationCard key={deal.id} {...deal} />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500 md:col-span-2">
              Tekshiruv navbati bo‘sh.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
