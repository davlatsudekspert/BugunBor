import { describe, expect, it } from 'vitest';

import { localeAlternates, localizedHref, routeLocale, withoutLocale } from './locale-paths';

// Russian pages at /ru/…: what search engines are told, and what the Worker
// asks the app for.

describe('Russian addresses', () => {
  it('put /ru in front of a page that is in both languages, and take it away', () => {
    expect(localizedHref('/', 'ru')).toBe('/ru');
    expect(localizedHref('/?city=samarkand', 'ru')).toBe('/ru?city=samarkand');
    expect(localizedHref('/deals/osh', 'ru')).toBe('/ru/deals/osh');
    expect(localizedHref('/discover?city=samarkand', 'ru')).toBe('/ru/discover?city=samarkand');
    expect(localizedHref('/ru/deals/osh', 'ru')).toBe('/ru/deals/osh');
    expect(localizedHref('/ru/deals/osh', 'uz')).toBe('/deals/osh');
    // Personal pages and the privacy policy (it has ?lang=) keep one address.
    for (const path of ['/account', '/login?next=/deals/osh', '/business/deals', '/privacy', '/api/v1/deals']) expect(localizedHref(path, 'ru')).toBe(path);
    expect(withoutLocale('/ru')).toBe('/');
    expect(withoutLocale('/ru/')).toBe('/');
    expect(withoutLocale('/ru?x=1')).toBe('/?x=1');
    expect(withoutLocale('/rudolf')).toBe('/rudolf');
    expect(withoutLocale('/r/abc')).toBe('/r/abc');
  });

  it('name the page in the language it is shown in, and both versions with Uzbek as the default', () => {
    expect(localeAlternates('/deals/osh', 'uz')).toEqual({
      canonical: '/deals/osh',
      languages: { uz: '/deals/osh', ru: '/ru/deals/osh', 'x-default': '/deals/osh' },
    });
    expect(localeAlternates('/', 'ru')).toEqual({ canonical: '/ru', languages: { uz: '/', ru: '/ru', 'x-default': '/' } });
  });

  it('serve /ru/… as the plain page with the language on Russian, and remember it for the next pages', () => {
    const route = routeLocale(new Request('https://bugunbor.uz/ru/deals/osh?x=1', { headers: { cookie: 'bb_city=samarkand; bb_locale=uz', accept: 'text/html' } }));
    expect(route?.kind).toBe('page');
    if (route?.kind !== 'page') return;
    expect(route.request.url).toBe('https://bugunbor.uz/deals/osh?x=1');
    expect(route.request.headers.get('cookie')).toBe('bb_city=samarkand; bb_locale=ru');
    expect(route.request.headers.get('accept')).toBe('text/html');
    expect(route.setCookie).toBe('bb_locale=ru; Path=/; Max-Age=31536000; Secure; SameSite=Lax');

    // Already on Russian: nothing to set. The home page is /ru.
    const again = routeLocale(new Request('https://bugunbor.uz/ru', { headers: { cookie: 'bb_locale=ru' } }));
    expect(again?.kind === 'page' && [new URL(again.request.url).pathname, again.setCookie]).toEqual(['/', null]);
  });

  it('send any other /ru/… address through the language switch, and leave the rest alone', () => {
    expect(routeLocale(new Request('https://bugunbor.uz/ru/account/codes?tab=1'))).toEqual({ kind: 'redirect', location: '/lang/ru?next=%2Faccount%2Fcodes%3Ftab%3D1' });
    for (const url of ['https://bugunbor.uz/deals/osh', 'https://bugunbor.uz/rudolf', 'https://bugunbor.uz/r/abc']) expect(routeLocale(new Request(url))).toBeNull();
  });
});
