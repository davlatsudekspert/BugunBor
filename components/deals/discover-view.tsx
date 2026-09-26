import { ArrowRight, ListFilter, MapPin, Search } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { getDb } from '@/db/client';
import { cityName, isCitySlug, nearestCity } from '@/lib/cities';
import { getPreferredCity } from '@/lib/city-cookie';
import { getConfig } from '@/lib/env';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/modules/auth/current';
import { SORT_KEYS, categoryName, getFavoriteIds, listCategories, listLiveDeals, type Category, type SortKey } from '@/modules/catalog/queries';
import { runMaintenance } from '@/modules/redemptions/service';
import { CategoryIcon, categoryColor } from './category-icon';
import { CitySelect } from './city-select';
import { DealCard } from './deal-card';
import { NearMeButton } from './near-me-button';

export type DiscoverParams = { q?: string; city?: string; category?: string; sort?: string; lat?: string; lng?: string; page?: string };

const PAGE_SIZE = 24;

function parsePoint(lat?: string, lng?: string) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!lat || !lng || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function href(basePath: string, params: DiscoverParams, changes: Partial<Record<keyof DiscoverParams, string | null>>) {
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value) url.set(key, value);
  }
  const query = url.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function DiscoverView({ params, basePath, category }: { params: DiscoverParams; basePath: string; category?: Category }) {
  const [{ t, locale }, preferredCity, user, db] = await Promise.all([getI18n(), getPreferredCity(), getCurrentUser(), getDb()]);
  await runMaintenance(db);
  const near = parsePoint(params.lat, params.lng);
  const city = isCitySlug(params.city) ? params.city : near ? nearestCity(near).slug : preferredCity;
  const requestedSort = SORT_KEYS.includes(params.sort as SortKey) ? (params.sort as SortKey) : 'ending';
  const sort: SortKey = requestedSort === 'near' && !near ? 'ending' : requestedSort;
  const categorySlug = category?.slug ?? (params.category || null);
  const page = Math.max(1, Math.min(20, Number.parseInt(params.page ?? '1', 10) || 1));

  const [deals, categories, favorites] = await Promise.all([
    listLiveDeals(db, { city, category: categorySlug, query: params.q, sort, near, demo: getConfig().demoMode }),
    category ? Promise.resolve([] as Category[]) : listCategories(db),
    user ? getFavoriteIds(db, user.id) : Promise.resolve(new Set<string>()),
  ]);
  const visible = deals.slice(0, page * PAGE_SIZE);
  const hasFilters = Boolean(params.q || params.category || near || (params.sort && params.sort !== 'ending'));
  const sortLabels: Record<SortKey, string> = t.discover.sort;

  return (
    <main>
      <section className="border-b border-slate-200 bg-sand">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {category ? (
            <div className="flex items-center gap-4">
              <span className={cn('grid size-14 place-items-center rounded-2xl', categoryColor(category.slug))}><CategoryIcon icon={category.icon} className="size-7" /></span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">{t.nav.categories}</p>
                <h1 className="mt-1 text-4xl font-black tracking-[-.05em] text-navy">{categoryName(category, locale)}</h1>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">{t.discover.kicker}</p>
              <h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-navy">{t.discover.title}</h1>
            </>
          )}

          <form action={basePath} className="mt-6 flex max-w-3xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
            <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 focus-within:ring-2 focus-within:ring-primary/25">
              <Search className="size-5 shrink-0 text-slate-400" aria-hidden />
              <span className="sr-only">{t.common.search}</span>
              <input defaultValue={params.q} name="q" placeholder={t.discover.searchPlaceholder} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400" />
            </label>
            <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus-within:ring-2 focus-within:ring-primary/25">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
              <CitySelect value={city} locale={locale} label={t.home.cityLabel} className="pr-1" autoSubmit />
            </div>
            {params.category && !category ? <input type="hidden" name="category" value={params.category} /> : null}
            {sort !== 'ending' && sort !== 'near' ? <input type="hidden" name="sort" value={sort} /> : null}
            <button type="submit" className="h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90">{t.home.find}</button>
          </form>

          <div className="mt-4 flex flex-wrap items-start gap-2" aria-label={t.discover.sortLabel}>
            <NearMeButton active={sort === 'near'} labels={{ nearMe: t.discover.nearMe, locating: t.discover.locating, denied: t.discover.locationDenied, unsupported: t.discover.locationUnsupported }} />
            {SORT_KEYS.filter((key) => key !== 'near').map((key) => (
              <a key={key} href={href(basePath, { ...params, city }, { sort: key === 'ending' ? null : key, lat: null, lng: null, page: null })} aria-current={sort === key ? 'true' : undefined} className={cn('inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold transition', sort === key ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40')}>
                {sortLabels[key]}
              </a>
            ))}
          </div>

          {!category && categories.length ? (
            <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              <a href={href(basePath, params, { category: null, page: null })} className={cn('inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-xs font-bold', !params.category ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600')}>{t.discover.allCategories}</a>
              {categories.map((item) => (
                <a key={item.slug} href={href(basePath, params, { category: item.slug, page: null })} className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-bold', params.category === item.slug ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600')}>
                  <CategoryIcon icon={item.icon} className="size-3.5" /> {categoryName(item, locale)}
                </a>
              ))}
            </div>
          ) : null}

          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <ListFilter className="size-4" aria-hidden /> {fmt(t.discover.results, { count: deals.length })} · {cityName(city, locale)}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {visible.length ? (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((deal) => (
                <DealCard key={deal.id} deal={deal} t={t} locale={locale} favorite={favorites.has(deal.id)} loggedIn={Boolean(user)} />
              ))}
            </div>
            {deals.length > visible.length ? (
              <div className="mt-8 text-center">
                <a href={href(basePath, { ...params, city }, { page: String(page + 1) })} className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-xl px-6 font-bold')}>
                  {t.common.more} <ArrowRight className="ml-1 size-4" aria-hidden />
                </a>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <MapPin className="mx-auto size-10 text-slate-300" aria-hidden />
            <h2 className="mt-4 text-xl font-bold text-navy">{category ? t.categories.emptyTitle : hasFilters ? t.discover.emptyTitle : t.home.emptyTitle}</h2>
            <p className="mt-2 text-slate-500">{category ? t.categories.emptyText : hasFilters ? t.discover.emptyText : t.home.emptyText}</p>
            {hasFilters ? <a href={basePath} className="mt-5 inline-flex font-bold text-primary">{t.discover.clear}</a> : <a href="/business" className="mt-5 inline-flex font-bold text-primary hover:underline">{t.home.emptyBusiness}</a>}
          </div>
        )}
      </section>
    </main>
  );
}
