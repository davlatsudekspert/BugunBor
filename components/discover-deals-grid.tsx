'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Clock3, ListFilter, LocateFixed, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CountdownTimer } from '@/components/countdown-timer';
import { formatDistanceKm, haversineDistanceKm } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { useLocation } from './location-provider';

type Deal = {
  id: string;
  slug: string;
  title: string;
  businessName: string;
  verified: boolean;
  branchName: string;
  discountPercent: number;
  discountedPriceUzs: number;
  originalPriceUzs: number | null;
  endsAt: string;
  categorySlug: string;
  latitudeE6: number;
  longitudeE6: number;
  isSponsored: boolean;
  imageUrl: string | null;
};

const formatPrice = (value: number | null) => (value === null ? '' : new Intl.NumberFormat('uz-UZ').format(value));
const RADIUS_OPTIONS_KM = [1, 3, 5, 10, 25, 50];

export function DiscoverDealsGrid({ deals, initialSort }: { deals: Deal[]; initialSort?: 'near' | 'ending' }) {
  const { coords, status, request } = useLocation();
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  // Clicking "Yaqin" on the homepage links here with ?sort=near — honor that by
  // asking for location right away instead of leaving the button meaningless.
  useEffect(() => {
    if (initialSort === 'near' && status === 'idle') request();
  }, [initialSort, status, request]);

  const withDistance = useMemo(
    () =>
      deals.map((deal) => ({
        ...deal,
        distanceKm: coords ? haversineDistanceKm(deal.latitudeE6, deal.longitudeE6, coords.latitude, coords.longitude) : null,
      })),
    [deals, coords],
  );

  const filtered = coords && radiusKm ? withDistance.filter((deal) => deal.distanceKm !== null && deal.distanceKm <= radiusKm) : withDistance;
  const sorted = coords ? [...filtered].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)) : filtered;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={request}
          disabled={status === 'requesting'}
          className={cn(buttonVariants({ variant: coords ? 'default' : 'outline' }), 'h-10 rounded-xl px-4 text-sm')}
        >
          <LocateFixed className="mr-1.5 size-4" /> {coords ? 'Joylashuv yoqilgan' : status === 'requesting' ? 'Aniqlanmoqda…' : 'Mening joylashuvimdan foydalanish'}
        </button>
        {coords ? (
          <select value={radiusKm ?? ''} onChange={(event) => setRadiusKm(event.target.value ? Number(event.target.value) : null)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none">
            <option value="">Butun shahar</option>
            {RADIUS_OPTIONS_KM.map((km) => <option key={km} value={km}>{km} km ichida</option>)}
          </select>
        ) : status === 'denied' ? (
          <span className="text-xs text-slate-400">Joylashuvga ruxsat berilmadi — brauzer sozlamalaridan qayta yoqishingiz mumkin.</span>
        ) : status === 'unsupported' ? (
          <span className="text-xs text-slate-400">Bu brauzerda joylashuv aniqlanmaydi.</span>
        ) : null}
        <span className="flex items-center gap-2 text-sm text-slate-500"><ListFilter className="size-4" /> {sorted.length} ta mos faol taklif</span>
      </div>

      {sorted.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((deal) => (
            <article key={deal.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(20,40,55,.06)]">
              <div className="relative flex h-28 items-center justify-between overflow-hidden bg-[#152a3b] p-5 text-white">
                {deal.imageUrl ? (
                  <>
                    <img src={deal.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </>
                ) : null}
                <div className="relative flex items-center gap-2">
                  <Badge className="bg-primary text-base font-black text-white">-{deal.discountPercent}%</Badge>
                  {deal.isSponsored ? <Badge className="border-orange-300 bg-orange-400/20 text-orange-200" variant="outline">Tavsiya etilgan</Badge> : null}
                </div>
                {deal.imageUrl ? null : <span className="relative text-6xl">{deal.categorySlug === 'xaridlar' ? '📚' : '🍽️'}</span>}
              </div>
              <div className="p-5">
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-600">{deal.businessName} {deal.verified ? <BadgeCheck className="size-4 fill-emerald-500 text-white" /> : null}</p>
                <h2 className="mt-2 text-xl font-black tracking-[-.03em]">{deal.title}</h2>
                <p className="mt-4 text-2xl font-black text-primary">{formatPrice(deal.discountedPriceUzs)} <span className="text-sm">so‘m</span> <span className="text-sm font-normal text-slate-400 line-through">{formatPrice(deal.originalPriceUzs)}</span></p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="size-3.5" />{deal.branchName}{deal.distanceKm !== null ? ` · ${formatDistanceKm(deal.distanceKm)}` : ''}</span>
                  <span className="flex items-center gap-1 font-bold text-orange-700"><Clock3 className="size-3.5" /><CountdownTimer endsAt={deal.endsAt} /></span>
                </div>
                <a href={`/deals/${deal.slug}`} className={cn(buttonVariants(), 'mt-5 h-10 w-full rounded-xl font-bold')}>Batafsil <ArrowRight className="ml-1 size-4" /></a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <MapPin className="mx-auto size-10 text-slate-300" />
          <h2 className="mt-4 text-xl font-bold">Hozircha mos aksiya topilmadi</h2>
          <p className="mt-2 text-slate-500">{coords && radiusKm ? 'Radiusni kengaytiring yoki qidiruvni qisqartiring.' : 'Qidiruvni qisqartiring yoki Toshkentni tanlab ko‘ring.'}</p>
        </div>
      )}
    </>
  );
}
