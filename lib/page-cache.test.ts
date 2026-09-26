import { describe, expect, it } from 'vitest';

import { cacheablePage, pageCacheKey } from './page-cache';

const page = (path: string, headers: Record<string, string> = {}, method = 'GET') =>
  new Request(`https://bugunbor.uz${path}`, { method, headers: { accept: 'text/html,application/xhtml+xml', ...headers } });

describe('guest page cache', () => {
  it('caches public pages for guests, keyed by build, language and city', () => {
    const key = pageCacheKey(page('/discover?q=osh', { cookie: 'bb_locale=ru; bb_city=samarkand' }), 'b1');
    expect(key?.url).toBe('https://bugunbor.uz/discover?q=osh&__build=b1&__bb_locale=ru&__bb_city=samarkand');
    expect(pageCacheKey(page('/'), 'b1')?.url).toBe('https://bugunbor.uz/?__build=b1&__bb_locale=&__bb_city=');
    for (const path of ['/categories', '/categories/taomlar', '/deals/osh-1', '/businesses/kafe', '/business', '/faq', '/oferta']) {
      expect(pageCacheKey(page(path), 'b1'), path).not.toBeNull();
    }
  });

  it('never caches anything personal or private', () => {
    expect(pageCacheKey(page('/', { cookie: 'bb_session=abc' }), 'b1')).toBeNull();
    expect(pageCacheKey(page('/deals/osh-1', { cookie: 'bb_city=tashkent; bb_login=xyz' }), 'b1')).toBeNull();
    for (const path of ['/account', '/account/codes', '/business/dashboard', '/admin', '/login', '/api/v1/deals', '/contact', '/r/ABC123']) {
      expect(pageCacheKey(page(path), 'b1'), path).toBeNull();
    }
    expect(pageCacheKey(page('/', {}, 'POST'), 'b1')).toBeNull();
    expect(pageCacheKey(page('/', { rsc: '1' }), 'b1')).toBeNull();
    expect(pageCacheKey(page('/discover?_rsc=x1'), 'b1')).toBeNull();
    expect(pageCacheKey(new Request('https://bugunbor.uz/', { headers: { accept: 'text/x-component' } }), 'b1')).toBeNull();
  });

  it('stores only complete HTML pages without cookies', () => {
    const html = { 'content-type': 'text/html; charset=utf-8' };
    expect(cacheablePage(new Response('ok', { headers: html }))).toBe(true);
    expect(cacheablePage(new Response('gone', { status: 404, headers: html }))).toBe(false);
    expect(cacheablePage(new Response('x', { headers: { ...html, 'set-cookie': 'bb_city=tashkent' } }))).toBe(false);
    expect(cacheablePage(new Response('{}', { headers: { 'content-type': 'application/json' } }))).toBe(false);
  });
});
