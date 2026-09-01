import type { Metadata } from 'next';
import { Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DiscoverDealsGrid } from '@/components/discover-deals-grid';
import { cn } from '@/lib/utils';
import { listActiveDeals } from '@/modules/catalog/repository';

export const metadata: Metadata = {
  title: 'Faol aksiyalarni topish',
  description: 'Shahar, biznes yoki taklif bo‘yicha faol BugunBor aksiyalarini qidiring.',
  alternates: { canonical: '/discover' },
};

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; view?: string; sort?: string }> }) {
  const params = await searchParams;
  const city = params.city === 'samarkand' ? 'Samarqand' : params.city === 'bukhara' ? 'Buxoro' : 'Toshkent';
  const deals = await listActiveDeals({ city, query: params.q, limit: 24 });

  return (
    <main className="min-h-screen bg-[#fffdf9] text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-black tracking-[-.04em]">Bugun<span className="text-primary">Bor</span></a>
          <a href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-xl px-4')}>Kirish</a>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-[#f8f1e8]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Badge className="bg-orange-50 text-orange-700">Jonli marketplace</Badge>
          <h1 className="mt-3 text-4xl font-black tracking-[-.05em]">Bugungi aksiyalar</h1>
          <form className="mt-6 flex max-w-3xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
            <label className="flex h-12 flex-1 items-center gap-2 px-3"><Search className="size-5 text-slate-400" /><span className="sr-only">Qidiruv</span><input defaultValue={params.q} name="q" placeholder="Taom, xizmat yoki biznes…" className="min-w-0 flex-1 outline-none" /></label>
            <select name="city" defaultValue={params.city ?? 'tashkent'} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none">
              <option value="tashkent">Toshkent</option><option value="samarkand">Samarqand</option><option value="bukhara">Buxoro</option>
            </select>
            <button type="submit" className="h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white">Topish</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <DiscoverDealsGrid deals={deals} initialSort={params.sort === 'near' ? 'near' : undefined} />
      </section>
    </main>
  );
}
