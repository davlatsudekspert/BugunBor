import { CalendarClock, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type UpcomingDeal = {
  id: string;
  slug: string;
  title: string;
  businessName: string;
  branchName: string;
  discountPercent: number;
  startsAt: string;
  categorySlug: string;
  imageUrl: string | null;
};

const formatStart = (startsAt: string) =>
  new Date(`${startsAt}Z`).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'medium', timeStyle: 'short' });

/** Deals a moderator has already approved but that haven't opened yet — see
 * modules/catalog/repository.ts's listUpcomingDeals(). Read-only: nothing here can be
 * claimed until it starts, so these link through to the deal page's own "hali boshlanmagan"
 * state rather than pretending a claim button belongs here. */
export function UpcomingDealsSection({ deals }: { deals: UpcomingDeal[] }) {
  if (!deals.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-5 text-sky-600" />
        <h2 className="text-xl font-black tracking-[-.03em]">Rejalashtirilgan aksiyalar</h2>
        <span className="text-sm text-slate-400">— tez orada boshlanadi</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <a
            key={deal.id}
            href={`/deals/${deal.slug}`}
            className="flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
          >
            {deal.imageUrl ? (
              <img src={deal.imageUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-white text-2xl">{deal.categorySlug === 'xaridlar' ? '📚' : '🍽️'}</div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-100 text-sky-700">-{deal.discountPercent}%</Badge>
                <span className="truncate text-sm font-bold text-slate-600">{deal.businessName}</span>
              </div>
              <h3 className="mt-1 truncate text-base font-black text-[#152a3b]">{deal.title}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3.5" />{deal.branchName}</p>
              <p className="mt-1 text-xs font-bold text-sky-700">Boshlanadi: {formatStart(deal.startsAt)}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
