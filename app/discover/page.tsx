import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DiscoverDealsGrid } from '@/components/discover-deals-grid';
import { DiscoverSearchBar } from '@/components/discover-search-bar';
import { cn } from '@/lib/utils';
import { getServerIdentity } from '@/modules/auth/identity';
import { listActiveDeals } from '@/modules/catalog/repository';

export const metadata: Metadata = {
  title: 'Faol aksiyalarni topish',
  description: 'Viloyat, tuman yoki taklif bo‘yicha faol BugunBor aksiyalarini qidiring.',
  alternates: { canonical: '/discover' },
};

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; region?: string; city?: string; view?: string; sort?: string }> }) {
  const params = await searchParams;
  const [deals, identity] = await Promise.all([
    listActiveDeals({ region: params.region, city: params.city, query: params.q, limit: 24 }),
    getServerIdentity(),
  ]);

  return (
    <main className="min-h-screen bg-[#fffdf9] text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-black tracking-[-.04em]">Bugun<span className="text-primary">Bor</span></a>
          <a href={identity ? '/account' : '/login'} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-xl px-4')}>{identity ? 'Hisobim' : 'Kirish'}</a>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-[#f8f1e8]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Badge className="bg-orange-50 text-orange-700">Jonli marketplace</Badge>
          <h1 className="mt-3 text-4xl font-black tracking-[-.05em]">Bugungi aksiyalar</h1>
          <DiscoverSearchBar defaultQuery={params.q} defaultRegion={params.region} defaultDistrict={params.city} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <DiscoverDealsGrid deals={deals} initialSort={params.sort === 'near' ? 'near' : undefined} />
      </section>
    </main>
  );
}
