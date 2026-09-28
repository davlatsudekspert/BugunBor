import type { Metadata } from 'next';

import { DiscoverView, type DiscoverParams } from '@/components/deals/discover-view';
import { cityName } from '@/lib/cities';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { localeAlternates } from '@/lib/locale-paths';
import { cityAbout } from '@/lib/place-texts';
import { firstValues } from '@/lib/search-params';

type Props = { searchParams: Promise<DiscoverParams> };

/** /discover?city=… is that city's page, with its own title and description; searches and orders within it point back to it. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [{ t, locale }, { city }] = await Promise.all([getI18n(), searchParams.then(firstValues)]);
  const about = cityAbout(city, locale);
  if (!city || !about) return { title: t.discover.title, description: t.meta.description, alternates: localeAlternates('/discover', locale) };
  return { title: fmt(t.discover.placeTitle, { name: cityName(city, locale) }), description: about, alternates: localeAlternates(`/discover?city=${city}`, locale) };
}

export default async function DiscoverPage({ searchParams }: Props) {
  return <DiscoverView params={firstValues(await searchParams)} basePath="/discover" />;
}
