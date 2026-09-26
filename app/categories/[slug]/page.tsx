import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DiscoverView, type DiscoverParams } from '@/components/deals/discover-view';
import { getDb } from '@/db/client';
import { getI18n } from '@/lib/i18n/server';
import { categoryName, listCategories } from '@/modules/catalog/queries';

async function findCategory(slug: string) {
  const categories = await listCategories(await getDb());
  return categories.find((category) => category.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [{ t, locale }, category] = await Promise.all([getI18n(), findCategory(slug)]);
  if (!category) return { title: t.notFound.title, robots: { index: false } };
  return { title: categoryName(category, locale), description: t.categories.text, alternates: { canonical: `/categories/${category.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<DiscoverParams> }) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();
  return <DiscoverView params={await searchParams} basePath={`/categories/${category.slug}`} category={category} />;
}
