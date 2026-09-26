import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AtSign, BadgeCheck, CalendarClock, Globe, MapPin, Navigation, Phone, Send } from 'lucide-react';

import { BusinessAvatar } from '@/components/deals/business-avatar';
import { CategoryIcon, categoryColor } from '@/components/deals/category-icon';
import { DealCard } from '@/components/deals/deal-card';
import { FollowButton } from '@/components/deals/follow-button';
import { RatingStars, ratingText } from '@/components/deals/rating-stars';
import { JsonLd } from '@/components/site/json-ld';
import { getDb } from '@/db/client';
import { demoEnabled } from '@/modules/demo';
import { cityName } from '@/lib/cities';
import { getConfig } from '@/lib/env';
import { formatDay, formatPhone, formatWorkingHours } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { directionsUrl, instagramUrl, telegramUrl } from '@/lib/maps';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/modules/auth/current';
import { getFavoriteIds, getPublicBusiness, listCategories } from '@/modules/catalog/queries';
import { followState } from '@/modules/engagement/follows';
import { listBusinessReviews } from '@/modules/engagement/reviews';

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
  const db = await getDb();
  return getPublicBusiness(db, slug, { demo: await demoEnabled(db) });
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
  const [favorites, categories, follow, reviews] = await Promise.all([
    user ? getFavoriteIds(db, user.id) : Promise.resolve(new Set<string>()),
    listCategories(db),
    followState(db, business.id, user?.id ?? null),
    listBusinessReviews(db, business.id, 12),
  ]);
  const category = categories.find((item) => item.slug === business.categorySlug);
  const websiteHost = safeHost(business.website);

  const origin = getConfig().appUrl ?? 'https://bugunbor.uz';
  const structured = business.isDemo
    ? null
    : {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: business.name,
        description: business.description,
        url: `${origin}/businesses/${business.slug}`,
        ...(business.logo ? { logo: `${origin}${business.logo}`, image: `${origin}${business.cover ?? business.logo}` } : {}),
        ...(business.phone ? { telephone: business.phone } : {}),
        address: business.branches.map((branch) => ({ '@type': 'PostalAddress', streetAddress: branch.address, addressLocality: cityName(branch.city, 'uz'), addressCountry: 'UZ' })),
        ...(business.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: (business.rating.basisPoints / 100).toFixed(1), reviewCount: business.rating.count } } : {}),
      };

  return (
    <main className="bg-cream pb-16">
      {structured ? <JsonLd data={structured} /> : null}
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
              {business.isDemo ? (
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{t.common.sample}</span>
              ) : (
                <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><BadgeCheck className="size-4 fill-emerald-500 text-white" aria-hidden /> {t.business.verified}</p>
              )}
              <h1 className="mt-1 text-4xl font-black tracking-[-.05em] text-navy">{business.name}</h1>
              {business.rating ? (
                <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-navy">
                  <RatingStars value={business.rating.basisPoints / 100} />
                  {ratingText(business.rating.basisPoints)}
                  <span className="font-semibold text-slate-500">· {fmt(t.business.ratingCount, { count: business.rating.count })}</span>
                </a>
              ) : null}
              <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {category ? <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold', categoryColor(category.slug))}><CategoryIcon icon={category.icon} className="size-3.5" /> {locale === 'ru' ? (category.nameRu ?? category.nameUz) : category.nameUz}</span> : null}
                <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden /> {cityName(business.city, locale)}</span>
              </p>
              <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-slate-600">{business.description}</p>
              <div className="mt-5">
                <FollowButton
                  businessId={business.id}
                  initial={follow}
                  loggedIn={Boolean(user)}
                  labels={{ follow: t.business.follow, following: t.business.following, followers: t.business.followers, hint: t.business.followHint }}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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

      <section id="reviews" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-10 sm:px-6">
        <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{t.business.reviewsTitle}</h2>
        {reviews.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <RatingStars value={review.rating} />
                  <span className="text-xs text-slate-400">{formatDay(parseDbTime(review.createdAt), t, locale)}</span>
                </div>
                {review.comment ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{review.comment}</p> : null}
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-bold text-navy">{review.author ?? '—'}</span>
                  <span>· {review.dealTitle}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck className="size-3.5" aria-hidden /> {t.business.verifiedReview}</span>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{t.business.noReviews}</p>
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
                <div className="-mb-2 mt-1 flex flex-wrap gap-x-4">
                  <a href={directionsUrl(branch)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 py-2 text-sm font-bold text-primary"><Navigation className="size-4" aria-hidden /> {t.common.directions}</a>
                  {branch.phone ? <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1.5 py-2 text-sm font-bold text-navy"><Phone className="size-4" aria-hidden /> {formatPhone(branch.phone)}</a> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
