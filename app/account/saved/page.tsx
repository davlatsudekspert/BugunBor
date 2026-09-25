import type { Metadata } from 'next';
import { Heart } from 'lucide-react';

import { BusinessAvatar } from '@/components/deals/business-avatar';
import { DealCard } from '@/components/deals/deal-card';
import { getDb } from '@/db/client';
import { cityName } from '@/lib/cities';
import { getConfig } from '@/lib/env';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { requireUser } from '@/modules/auth/current';
import { listFavoriteDeals } from '@/modules/catalog/queries';
import { listFollowedBusinesses } from '@/modules/engagement/follows';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.saved.title, robots: { index: false, follow: false } };
}

export default async function SavedPage() {
  const user = await requireUser('/account/saved');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const demo = getConfig().demoMode;
  const [{ live, ended }, followed] = await Promise.all([listFavoriteDeals(db, user.id, { demo }), listFollowedBusinesses(db, user.id, { demo })]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{t.saved.title}</h1>
      {live.length === 0 && ended.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Heart className="mx-auto size-10 text-slate-300" aria-hidden />
          <h2 className="mt-4 text-xl font-bold text-navy">{t.saved.emptyTitle}</h2>
          <p className="mt-2 text-slate-500">{t.saved.emptyText}</p>
          <a href="/discover" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 font-bold text-white">{t.codes.findDeals}</a>
        </div>
      ) : null}
      {live.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {live.map((deal) => <DealCard key={deal.id} deal={deal} t={t} locale={locale} favorite loggedIn showCity />)}
        </div>
      ) : null}
      <section className="mt-12">
        <h2 className="text-sm font-black uppercase tracking-[.14em] text-slate-500">{t.saved.followedTitle}</h2>
        {followed.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {followed.map((business) => (
              <li key={business.id}>
                <a href={`/businesses/${business.slug}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary/40">
                  <BusinessAvatar name={business.name} logo={business.logo} className="size-12 rounded-xl bg-navy text-sm font-black text-white" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black text-navy">{business.name}</span>
                    <span className="block text-xs text-slate-500">{cityName(business.city, locale)} · {business.liveDeals ? fmt(t.saved.liveDeals, { count: business.liveDeals }) : t.saved.noLiveDeals}</span>
                  </span>
                  {business.liveDeals ? <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">{business.liveDeals}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{t.saved.followedEmpty}</p>
        )}
      </section>
      {ended.length ? (
        <section className="mt-12">
          <h2 className="text-sm font-black uppercase tracking-[.14em] text-slate-500">{t.saved.ended}</h2>
          <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {ended.map((deal) => (
              <li key={deal.id} className="flex items-center justify-between gap-3 p-4">
                <a href={`/deals/${deal.slug}`} className="min-w-0 truncate font-bold text-navy hover:text-primary">{deal.title}</a>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{t.deal.status[deal.effective]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
