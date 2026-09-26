export const LOCALES = ['uz', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';
export const LOCALE_COOKIE = 'bb_locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function htmlLang(locale: Locale) {
  return locale === 'ru' ? 'ru' : 'uz-Latn';
}

/** Replaces `{name}` placeholders. Unknown placeholders are left untouched. */
export function fmt(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
