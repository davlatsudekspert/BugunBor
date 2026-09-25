import { ArrowRight, Clock3, LocateFixed, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';

import { CategoryIcon, categoryColor } from '@/components/deals/category-icon';
import { CitySelect } from '@/components/deals/city-select';
import { Countdown } from '@/components/deals/countdown';
import { DealCard } from '@/components/deals/deal-card';
import { DealVisual } from '@/components/deals/deal-visual';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { getDb } from '@/db/client';
import { cityName } from '@/lib/cities';
import { getPreferredCity } from '@/lib/city-cookie';
import { getConfig } from '@/lib/env';
import { formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/modules/auth/current';
import { categoryName, countByCategory, getFavoriteIds, listCategories, listLiveDeals } from '@/modules/catalog/queries';
import { runMaintenance } from '@/modules/redemptions/service';

export default async function Home() {
  const [{ t, locale }, city, user, db] = await Promise.all([getI18n(), getPreferredCity(), getCurrentUser(), getDb()]);
  await runMaintenance(db);
  const demo = getConfig().demoMode;
  const [deals, categories, favorites] = await Promise.all([
    listLiveDeals(db, { city, demo, sort: 'ending' }),
    listCategories(db),
    user ? getFavoriteIds(db, user.id) : Promise.resolve(new Set<string>()),
  ]);
  const counts = countByCategory(deals);
  const featured = deals[0];
  const cityLabel = cityName(city, locale);

  return (
    <main className="overflow-hidden">
      <section className="relative border-b border-slate-200/70 bg-cream">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,rgba(255,182,135,.3),transparent_28%),radial-gradient(circle_at_8%_84%,rgba(255,222,184,.35),transparent_22%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.06fr_.94fr] lg:px-8 lg:py-20">
          <div>
            <Badge className="mb-5 h-7 border-orange-200 bg-orange-50 px-3 text-orange-700" variant="outline">
              <Sparkles className="size-3.5" aria-hidden /> {fmt(t.home.badge, { city: cityLabel, count: deals.length })}
            </Badge>
            <h1 className="max-w-3xl text-[clamp(2.6rem,6vw,5.4rem)] font-black leading-[.95] tracking-[-.055em] text-navy">
              {t.home.heroLead} <span className="text-primary">{t.home.heroAccent}</span> {t.home.heroTail}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">{t.home.heroText}</p>

            <form action="/discover" className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(30,50,65,.12)] sm:flex-row">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 focus-within:ring-2 focus-within:ring-primary/25">
                <Search className="size-5 shrink-0 text-slate-400" aria-hidden />
                <span className="sr-only">{t.home.searchLabel}</span>
                <input name="q" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder={t.home.searchPlaceholder} />
              </label>
              <div className="flex h-12 items-center gap-2 border-slate-200 px-3 text-sm font-semibold text-slate-700 sm:border-l">
                <MapPin className="size-4 text-primary" aria-hidden />
                <CitySelect value={city} locale={locale} label={t.home.cityLabel} className="pr-2" />
              </div>
              <button className="h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90" type="submit">{t.home.find}</button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <a href="/discover?sort=near" className="flex items-center gap-1.5 font-semibold text-navy hover:text-primary"><LocateFixed className="size-4 text-primary" aria-hidden /> {t.discover.nearMe}</a>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-emerald-600" aria-hidden /> {t.home.trustVerified}</span>
              <span className="flex items-center gap-1.5"><Sparkles className="size-4 text-amber-500" aria-hidden /> {t.home.trustFree}</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:justify-self-end">
            <div className="absolute -inset-8 -z-10 rounded-full bg-orange-200/30 blur-3xl" />
            <div className="rounded-[32px] border border-white/80 bg-navy p-4 shadow-[0_30px_80px_rgba(18,43,61,.24)] sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1 text-white">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-orange-200">{t.home.liveKicker}</p>
                  <p className="mt-1 text-xl font-bold">{t.home.liveTitle}</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-400" aria-hidden /> {t.home.liveBadge}
                </span>
              </div>
              {featured ? (
                <a href={`/deals/${featured.slug}`} className="group block overflow-hidden rounded-[24px] bg-[#f7efe5]">
                  <div className="relative p-5">
                    <DealVisual visual={featured.visual} categorySlug={featured.categorySlug} photo={featured.photo} priority className="absolute right-0 top-0 h-32 w-36 rounded-bl-[70px]" emojiClassName="-bottom-4 -right-2 text-7xl" />
                    <div className="relative max-w-[62%]">
                      <Badge className="bg-navy text-white">-{featured.discountPercent}%</Badge>
                      <h2 className="mt-8 text-2xl font-black leading-tight tracking-[-.04em] text-navy">{featured.title}</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-600">{featured.business.name}</p>
                      <p className="mt-5 text-2xl font-black text-primary">{formatSum(featured.price, t)}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
                      <span className="flex items-center gap-2 text-sm font-bold text-navy"><Clock3 className="size-4 text-primary" aria-hidden /> <Countdown target={featured.endsAt} daysLabel={t.common.daysShort} className="tabular" /></span>
                      <span className="text-sm font-bold text-primary">{t.home.view} <ArrowRight className="ml-1 inline size-4" aria-hidden /></span>
                    </div>
                  </div>
                </a>
              ) : (
                <div className="rounded-[24px] bg-[#f7efe5] p-8 text-center">
                  <p className="text-lg font-black text-navy">{t.home.emptyTitle}</p>
                  <p className="mt-2 text-sm text-slate-600">{t.home.emptyText}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">{t.home.categoriesKicker}</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-navy">{t.home.categoriesTitle}</h2>
          </div>
          <a href="/categories" className="hidden items-center gap-1 text-sm font-bold text-primary sm:flex">{t.home.seeAll} <ArrowRight className="size-4" aria-hidden /></a>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((category) => (
            <a key={category.slug} href={`/categories/${category.slug}`} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg">
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', categoryColor(category.slug))}><CategoryIcon icon={category.icon} className="size-5" /></span>
              <span className="min-w-0"><strong className="block truncate text-navy">{categoryName(category, locale)}</strong><small className="text-slate-500">{fmt(t.home.categoryCount, { count: counts.get(category.slug) ?? 0 })}</small></span>
            </a>
          ))}
        </div>
      </section>

      <section id="deals" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">{t.home.dealsKicker}</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-navy">{t.home.dealsTitle}</h2>
          </div>
          <div className="flex gap-2">
            <a href="/discover?sort=ending" className="rounded-full bg-navy px-4 py-2 text-xs font-bold text-white">{t.home.sortEnding}</a>
            <a href="/discover?sort=discount" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-primary/40">{t.home.sortDiscount}</a>
          </div>
        </div>

        {deals.length ? (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {deals.slice(0, 6).map((deal) => (
                <DealCard key={deal.id} deal={deal} t={t} locale={locale} favorite={favorites.has(deal.id)} loggedIn={Boolean(user)} />
              ))}
            </div>
            {deals.length > 6 ? (
              <div className="mt-8 text-center">
                <a href="/discover" className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-xl px-6 font-bold')}>{t.home.seeAll} <ArrowRight className="ml-1 size-4" aria-hidden /></a>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <MapPin className="mx-auto size-10 text-slate-300" aria-hidden />
            <h3 className="mt-4 text-xl font-bold text-navy">{t.home.emptyTitle}</h3>
            <p className="mt-2 text-slate-500">{t.home.emptyText}</p>
          </div>
        )}
      </section>

      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <Badge className="bg-orange-400/15 text-orange-200">{t.home.businessBadge}</Badge>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-[-.04em]">{t.home.businessTitle}</h2>
            <p className="mt-3 text-slate-300">{t.home.businessText}</p>
          </div>
          <a className={cn(buttonVariants(), 'h-12 rounded-xl bg-white px-6 font-bold text-navy hover:bg-orange-50')} href="/business">{t.home.businessCta} <ArrowRight className="ml-2 size-4" aria-hidden /></a>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:px-8">
        <img src="/og.png" width="1728" height="905" loading="lazy" alt={t.meta.ogAlt} className="w-full rounded-[24px] border border-orange-100 shadow-[0_18px_50px_rgba(25,45,60,.12)]" />
        <div>
          <Badge className="bg-orange-50 text-orange-700">{t.home.howKicker}</Badge>
          <h2 className="mt-4 text-3xl font-black tracking-[-.04em] text-navy">{t.home.howTitle}</h2>
          <ol className="mt-6 space-y-4">
            {t.home.steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-white">{index + 1}</span>
                <span><strong className="block text-navy">{step.title}</strong><span className="text-sm leading-6 text-slate-600">{step.text}</span></span>
              </li>
            ))}
          </ol>
          <a href="/how-it-works" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">{t.home.howMore} <ArrowRight className="size-4" aria-hidden /></a>
        </div>
      </section>
    </main>
  );
}
