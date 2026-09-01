'use client';

import { useState } from 'react';
import { ArrowRight, BadgeCheck, Clock3, Heart, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SavedDeal = {
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
  status: string;
  categorySlug: string;
  imageUrl: string | null;
};

const formatPrice = (value: number | null) => (value === null ? '' : new Intl.NumberFormat('uz-UZ').format(value));

export function SavedDealsGrid({ deals: initialDeals }: { deals: SavedDeal[] }) {
  const [deals, setDeals] = useState(initialDeals);

  async function unsave(dealId: string) {
    setDeals((current) => current.filter((deal) => deal.id !== dealId));
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (window.location.hostname === 'localhost') headers['x-bugunbor-demo-user'] = 'usr_customer_browser';
    await fetch('/api/v1/favorites', { method: 'POST', headers, body: JSON.stringify({ dealId }) }).catch(() => {});
  }

  if (!deals.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Heart className="mx-auto size-10 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold">Hali hech narsa saqlanmagan</h2>
        <p className="mt-2 text-slate-500">Yoqqan aksiyani ochib, “Saqlash” tugmasini bosing — u shu yerda paydo bo‘ladi.</p>
        <a href="/discover" className={cn(buttonVariants(), 'mt-5 h-10 rounded-xl px-5')}>Aksiyalarni ko‘rish</a>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {deals.map((deal) => (
        <article key={deal.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(20,40,55,.06)]">
          <div className="relative flex h-24 items-center justify-between overflow-hidden bg-[#152a3b] p-5 text-white">
            {deal.imageUrl ? (
              <>
                <img src={deal.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </>
            ) : null}
            <div className="relative flex items-center gap-2">
              <Badge className="bg-primary text-base font-black text-white">-{deal.discountPercent}%</Badge>
              {deal.status !== 'ACTIVE' ? <Badge className="border-slate-300 bg-white/10 text-slate-200" variant="outline">Tugagan</Badge> : null}
            </div>
            <button onClick={() => unsave(deal.id)} aria-label="Saqlanganlardan olib tashlash" className="relative rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
              <Heart className="size-5 fill-current" />
            </button>
          </div>
          <div className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-600">{deal.businessName} {deal.verified ? <BadgeCheck className="size-4 fill-emerald-500 text-white" /> : null}</p>
            <h2 className="mt-2 text-xl font-black tracking-[-.03em]">{deal.title}</h2>
            <p className="mt-4 text-2xl font-black text-primary">{formatPrice(deal.discountedPriceUzs)} <span className="text-sm">so‘m</span> <span className="text-sm font-normal text-slate-400 line-through">{formatPrice(deal.originalPriceUzs)}</span></p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="size-3.5" />{deal.branchName}</span>
              <span className="flex items-center gap-1 font-bold text-orange-700"><Clock3 className="size-3.5" />{new Date(`${deal.endsAt}Z`).toLocaleDateString('uz-UZ')}</span>
            </div>
            <a href={`/deals/${deal.slug}`} className={cn(buttonVariants(), 'mt-5 h-10 w-full rounded-xl font-bold')}>Batafsil <ArrowRight className="ml-1 size-4" /></a>
          </div>
        </article>
      ))}
    </div>
  );
}
