import { cookies } from 'next/headers';

import { DEFAULT_CITY, isCitySlug } from '@/lib/cities';

export const CITY_COOKIE = 'bb_city';

/** The city the visitor last chose, remembered in a cookie by the search forms. */
export async function getPreferredCity() {
  const value = (await cookies()).get(CITY_COOKIE)?.value;
  return isCitySlug(value) ? value : DEFAULT_CITY;
}
