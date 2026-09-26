import type { Metadata } from 'next';

import { DiscoverView, type DiscoverParams } from '@/components/deals/discover-view';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.discover.title, description: t.meta.description, alternates: { canonical: '/discover' } };
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<DiscoverParams> }) {
  return <DiscoverView params={await searchParams} basePath="/discover" />;
}
