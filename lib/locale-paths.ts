import { isSecureRequest, readCookie, serializeCookie } from './cookies';
import { LOCALE_COOKIE, type Locale } from './i18n/config';

// Russian pages have addresses of their own, /ru/…, so search engines find and
// index them; the Uzbek page stays at the plain address. The Worker
// (worker.ts) serves /ru/… as the same page rendered in Russian and keeps the
// visitor's language on Russian, so the plain links in it stay Russian too.
// Each page names both versions (hreflang) and the sitemap lists both.

export const RU_PREFIX = '/ru';

/** Public pages that exist in both languages. The privacy policy has its own (?lang=uz|ru|en). */
const LOCALIZED_PAGES = [
  /^\/$/, /^\/discover$/, /^\/categories(?:\/[a-z0-9-]+)?$/, /^\/deals\/[^/]+$/, /^\/businesses\/[^/]+$/, /^\/business$/,
  /^\/how-it-works$/, /^\/faq$/, /^\/terms$/, /^\/oferta$/, /^\/credits$/, /^\/ilova$/, /^\/qollanma$/, /^\/contact$/,
];

const RU_PATH = /^\/ru(?=[/?#]|$)/;

export const isLocalizedPath = (pathname: string) => LOCALIZED_PAGES.some((pattern) => pattern.test(pathname));

/** "/ru/deals/osh" → "/deals/osh", "/ru?city=x" → "/?city=x"; any other address as it is. */
export function withoutLocale(href: string) {
  if (!RU_PATH.test(href)) return href;
  const rest = href.replace(RU_PATH, '');
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/** A page's address in a language: "/deals/osh" → "/ru/deals/osh"; pages that are not in both languages keep theirs. */
export function localizedHref(href: string, locale: Locale) {
  const plain = withoutLocale(href);
  if (locale !== 'ru' || !isLocalizedPath(plain.split(/[?#]/, 1)[0])) return plain;
  return plain.startsWith('/?') || plain.startsWith('/#') || plain === '/' ? RU_PREFIX + plain.slice(1) : RU_PREFIX + plain;
}

/** For a page's metadata: the address in the language it is shown in, and both versions for search engines. */
export function localeAlternates(href: string, locale: Locale) {
  const uz = localizedHref(href, 'uz');
  return { canonical: localizedHref(href, locale), languages: { uz, ru: localizedHref(href, 'ru'), 'x-default': uz } };
}

export type LocaleRoute =
  | { kind: 'page'; request: Request; setCookie: string | null }
  | { kind: 'redirect'; location: string };

/**
 * What the Worker does with /ru/…: a page in both languages is asked for as
 * the plain address with the language cookie on Russian (and the visitor's
 * cookie is set to Russian when it is not); any other /ru/… address goes to
 * the plain one through the language switch. Null for every other address.
 */
export function routeLocale(request: Request): LocaleRoute | null {
  const url = new URL(request.url);
  if (!RU_PATH.test(url.pathname)) return null;
  const pathname = withoutLocale(url.pathname);
  if (!isLocalizedPath(pathname)) return { kind: 'redirect', location: `/lang/ru?next=${encodeURIComponent(pathname + url.search)}` };
  const inner = new URL(url);
  inner.pathname = pathname;
  const headers = new Headers(request.headers);
  const others = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim()).filter((part) => part && !part.startsWith(`${LOCALE_COOKIE}=`));
  headers.set('cookie', [...others, `${LOCALE_COOKIE}=ru`].join('; '));
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body;
  return {
    kind: 'page',
    request: new Request(inner, { method: request.method, headers, body, redirect: 'manual' }),
    setCookie: readCookie(request, LOCALE_COOKIE) === 'ru' ? null : serializeCookie(LOCALE_COOKIE, 'ru', { maxAge: 365 * 24 * 60 * 60, httpOnly: false, secure: isSecureRequest(request) }),
  };
}
