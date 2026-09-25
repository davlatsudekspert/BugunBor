import type { Locale } from './config';
import { ru } from './ru';
import { uz, type Dictionary } from './uz';

export type { Dictionary };
export { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, fmt, htmlLang, isLocale, type Locale } from './config';

const dictionaries: Record<Locale, Dictionary> = { uz, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type ErrorCode = keyof Dictionary['errors'];

export function errorMessage(t: Dictionary, code: string, fallback?: string) {
  return (t.errors as Record<string, string>)[code] ?? fallback ?? t.common.unknownError;
}
