import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import { CategoryIcon, categoryColor } from '@/components/deals/category-icon';
import { getDb } from '@/db/client';
import { cityName } from '@/lib/cities';
import { getPreferredCity } from '@/lib/city-cookie';
import { getConfig } from '@/lib/env';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { categoryName, countByCategory, listCategories, listLiveDeals } from '@/modules/catalog/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.categories.title, description: t.categories.text, alternates: { canonical: '/categories' } };
}

export default async function CategoriesPage() {
  const [{ t, locale }, city, db] = await Promise.all([getI18n(), getPreferredCity(), getDb()]);
  const [categories, deals] = await Promise.all([listCategories(db), listLiveDeals(db, { city, demo: getConfig().demoMode })]);
  const counts = countByCategory(deals);
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">{cityName(city, locale)}</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-navy">{t.categories.title}</h1>
      <p className="mt-3 text-slate-600">{t.categories.text}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <a key={category.slug} href={`/categories/${category.slug}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg">
            <span className="flex min-w-0 items-center gap-4">
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', categoryColor(category.slug))}><CategoryIcon icon={category.icon} className="size-6" /></span>
              <span className="min-w-0">
                <strong className="block truncate text-xl text-navy">{categoryName(category, locale)}</strong>
                <small className="mt-1 block text-slate-500">{fmt(t.categories.count, { count: counts.get(category.slug) ?? 0 })}</small>
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-primary transition group-hover:translate-x-1" aria-hidden />
          </a>
        ))}
      </div>
    </main>
  );
}
