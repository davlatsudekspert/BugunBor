import { cookies } from 'next/headers';

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';
import { getDictionary } from './index';

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
