import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PlusCircle } from 'lucide-react';

import { DealManagerCard } from '@/components/business-deal-manager-card';
import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { getOwnedBusiness } from '@/modules/catalog/ownership';
import { getServerIdentity } from '@/modules/auth/identity';

export const metadata: Metadata = { title: 'Aksiyalarim', robots: { index: false, follow: false } };

export type ManagedDeal = {
  id: string;
  title: string;
  status: string;
  originalPriceUzs: number | null;
  discountedPriceUzs: number;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  totalQuantity: number | null;
  remainingQuantity: number | null;
  imageUrl: string | null;
};

export default async function BusinessDealsPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=%2Fbusiness%2Fdeals');

  await ensurePhase1Database();
  await syncDealLifecycle();
  const db = getD1();
  const params = await searchParams;
  // ?business= lets an owner of more than one business pick which one — omitting it falls
  // back to the newest membership, same as before, so a single-business owner sees no change.
  const business = await getOwnedBusiness(db, identity.id, 'deal.write', params.business);
  if (!business) redirect('/business/dashboard');

  const deals = await db
    .prepare(`SELECT id, title, status, original_price_uzs AS originalPriceUzs, discounted_price_uzs AS discountedPriceUzs,
        discount_percent AS discountPercent, starts_at AS startsAt, ends_at AS endsAt,
        total_quantity AS totalQuantity, remaining_quantity AS remainingQuantity, image_url AS imageUrl
      FROM deals WHERE business_id = ?1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`)
    .bind(business.id)
    .all<ManagedDeal>();

  return (
    <main className="min-h-screen bg-slate-50 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
          <a href={`/business/dashboard?business=${business.id}`} className="text-sm font-bold text-slate-500">← Boshqaruv paneli</a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Aksiyalarim</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Barcha aksiyalar</h1>
          </div>
          {business.verificationStatus === 'VERIFIED' ? (
            <a href={`/business/deals/new?business=${business.id}`} className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white">
              <PlusCircle className="size-4" /> Yangi aksiya
            </a>
          ) : null}
        </div>

        <div className="mt-8 space-y-3">
          {deals.results.length ? (
            deals.results.map((deal) => <DealManagerCard key={deal.id} deal={deal} />)
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Hali aksiya qo‘shilmagan.</p>
          )}
        </div>
      </div>
    </main>
  );
}
