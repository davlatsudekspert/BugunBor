import type { Metadata } from 'next';
import { ArrowRight, BadgeCheck, Clock3, ListFilter, MapPin, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listActiveDeals } from '@/modules/catalog/repository';

export const metadata: Metadata = {
  title: 'Faol aksiyalarni topish',
  description: 'Shahar, biznes yoki taklif bo‘yicha faol BugunBor aksiyalarini qidiring.',
  alternates: { canonical: '/discover' },
};

const formatPrice = (value: number | null) => value === null ? '' : new Intl.NumberFormat('uz-UZ').format(value);

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; view?: string }> }) {
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
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><ListFilter className="size-4" /> {deals.length} ta mos faol taklif</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {deals.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deals.map((deal) => (
              <article key={deal.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(20,40,55,.06)]">
                <div className="flex h-28 items-center justify-between bg-[#152a3b] p-5 text-white">
                  <Badge className="bg-primary text-base font-black text-white">-{deal.discountPercent}%</Badge>
                  <span className="text-6xl">{deal.categorySlug === 'xaridlar' ? '📚' : '🍽️'}</span>
                </div>
                <div className="p-5">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-600">{deal.businessName} {deal.verified ? <BadgeCheck className="size-4 fill-emerald-500 text-white" /> : null}</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-.03em]">{deal.title}</h2>
                  <p className="mt-4 text-2xl font-black text-primary">{formatPrice(deal.discountedPriceUzs)} <span className="text-sm">so‘m</span> <span className="text-sm font-normal text-slate-400 line-through">{formatPrice(deal.originalPriceUzs)}</span></p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin className="size-3.5" />{deal.branchName}</span><span className="flex items-center gap-1 font-bold text-orange-700"><Clock3 className="size-3.5" />{new Date(`${deal.endsAt}Z`).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' })} gacha</span></div>
                  <a href={`/deals/${deal.slug}`} className={cn(buttonVariants(), 'mt-5 h-10 w-full rounded-xl font-bold')}>Batafsil <ArrowRight className="ml-1 size-4" /></a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><MapPin className="mx-auto size-10 text-slate-300" /><h2 className="mt-4 text-xl font-bold">Hozircha mos aksiya topilmadi</h2><p className="mt-2 text-slate-500">Qidiruvni qisqartiring yoki Toshkentni tanlab ko‘ring.</p></div>
        )}
      </section>
    </main>
  );
}
