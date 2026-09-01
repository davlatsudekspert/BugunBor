import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SavedDealsGrid } from '@/components/saved-deals-grid';
import { getServerIdentity } from '@/modules/auth/identity';
import { listFavoriteDeals } from '@/modules/catalog/repository';

export const metadata: Metadata = { title: 'Saqlangan aksiyalar', robots: { index: false, follow: false } };

export default async function SavedDealsPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=/account/saved');
  const deals = await listFavoriteDeals(identity.id);

  return (
    <main className="min-h-screen bg-[#fffdf9] pb-24 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="text-xl font-black tracking-[-.04em]">Bugun<span className="text-primary">Bor</span></a>
          <a href="/account" className="text-sm font-bold text-slate-600">← Hisobim</a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black tracking-[-.04em]">Saqlangan aksiyalar</h1>
        <p className="mt-2 text-slate-500">Keyinroq qaytib ko‘rmoqchi bo‘lgan takliflaringiz shu yerda.</p>
        <div className="mt-8">
          <SavedDealsGrid deals={deals} />
        </div>
      </div>
    </main>
  );
}
