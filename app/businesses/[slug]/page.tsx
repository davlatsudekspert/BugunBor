import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AtSign, BadgeCheck, CalendarClock, Globe, MapPin, Navigation, Phone, Send } from 'lucide-react';

import { BusinessAvatar } from '@/components/deals/business-avatar';
import { CategoryIcon, categoryColor } from '@/components/deals/category-icon';
import { DealCard } from '@/components/deals/deal-card';
import { getDb } from '@/db/client';
import { cityName } from '@/lib/cities';
import { getConfig } from '@/lib/env';
import { formatPhone, formatWorkingHours } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { directionsUrl, instagramUrl, telegramUrl } from '@/lib/maps';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/modules/auth/current';
import { getFavoriteIds, getPublicBusiness, listCategories } from '@/modules/catalog/queries';

function safeHost(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}

async function load(slug: string) {
  return getPublicBusiness(await getDb(), slug, { demo: getConfig().demoMode });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [{ t }, business] = await Promise.all([getI18n(), load(slug)]);
  if (!business) return { title: t.business.notFoundTitle, robots: { index: false } };
  return { title: business.name, description: business.description.slice(0, 200), alternates: { canonical: `/businesses/${business.slug}` } };
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ t, locale }, business, user] = await Promise.all([getI18n(), load(slug), getCurrentUser()]);
  if (!business) notFound();
  const db = await getDb();
  const [favorites, categories] = await Promise.all([user ? getFavoriteIds(db, user.id) : Promise.resolve(new Set<string>()), listCategories(db)]);
  const category = categories.find((item) => item.slug === business.categorySlug);
  const websiteHost = safeHost(business.website);

  return (
    <main className="bg-cream pb-16">
      <section className="border-b border-slate-200 bg-white">
        {business.cover ? (
          <div className="relative h-44 overflow-hidden bg-slate-200 sm:h-64">
            <img src={business.cover} alt="" className="absolute inset-0 size-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ) : null}
        <div className={cn('mx-auto max-w-6xl px-4 py-10 sm:px-6', business.cover && 'pt-0')}>
          <div className="flex flex-wrap items-start gap-5">
            <BusinessAvatar name={business.name} logo={business.logo} className={cn('size-20 rounded-3xl bg-navy text-2xl font-black text-white shadow-[0_12px_30px_rgba(21,42,59,.25)]', business.cover && '-mt-10 ring-4 ring-white')} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><BadgeCheck className="size-4 fill-emerald-500 text-white" aria-hidden /> {t.business.verified}</p>
              <h1 className="mt-1 text-4xl font-black tracking-[-.05em] text-navy">{business.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {category ? <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold', categoryColor(category.slug))}><CategoryIcon icon={category.icon} className="size-3.5" /> {locale === 'ru' ? (category.nameRu ?? category.nameUz) : category.nameUz}</span> : null}
                <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden /> {cityName(business.city, locale)}</span>
              </p>
              <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-slate-600">{business.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {business.phone ? <a href={`tel:${business.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-navy hover:border-primary/40"><Phone className="size-4" aria-hidden /> {formatPhone(business.phone)}</a> : null}
                {business.telegram ? <a href={telegramUrl(business.telegram)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-navy hover:border-primary/40"><Send className="size-4" aria-hidden /> Telegram</a> : null}
                {business.instagram ? <a href={instagramUrl(business.instagram)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-navy hover:border-primary/40"><AtSign className="size-4" aria-hidden /> Instagram</a> : null}
                {websiteHost ? <a href={business.website!} target="_blank" rel="noreferrer nofollow" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-navy hover:border-primary/40"><Globe className="size-4" aria-hidden /> {websiteHost}</a> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{t.business.activeDeals}</h2>
        {business.deals.length || business.upcoming.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...business.deals, ...business.upcoming].map((deal) => (
              <DealCard key={deal.id} deal={deal} t={t} locale={locale} favorite={favorites.has(deal.id)} loggedIn={Boolean(user)} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">{t.business.noDeals}</p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{t.business.branches}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {business.branches.map((branch) => {
            const hours = formatWorkingHours(branch.hoursJson, t);
            return (
              <div key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-center gap-2 font-bold text-navy"><MapPin className="size-4 text-primary" aria-hidden /> {branch.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{branch.address}, {cityName(branch.city, locale)}</p>
                {hours ? <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><CalendarClock className="size-4" aria-hidden /> {hours}</p> : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  <a href={directionsUrl(branch)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary"><Navigation className="size-4" aria-hidden /> {t.common.directions}</a>
                  {branch.phone ? <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-navy"><Phone className="size-4" aria-hidden /> {formatPhone(branch.phone)}</a> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
