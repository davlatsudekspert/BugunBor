import { describe, expect, it } from 'vitest';

import { apiCacheKey, cacheState, cacheableApi, cacheablePage, pageCacheKey } from './page-cache';

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

describe('public API cache', () => {
  const call = (path: string, headers: Record<string, string> = {}, method = 'GET') => new Request(`https://bugunbor.uz${path}`, { method, headers: { 'x-app': 'bugunbor', ...headers } });

  it('shares config and the deal list with everyone, keyed by build and language', () => {
    expect(apiCacheKey(call('/api/v1/config', { 'x-locale': 'ru' }), 'b1')?.key.url).toBe('https://bugunbor.uz/api/v1/config?__build=b1&__locale=ru');
    expect(apiCacheKey(call('/api/v1/config', { authorization: 'Bearer abcdefghijklmnopqrstu' }), 'b1')?.seconds).toBe(60);
    expect(apiCacheKey(call('/api/v1/deals?city=tashkent', { cookie: 'bb_session=abc' }), 'b1')?.key.url).toBe('https://bugunbor.uz/api/v1/deals?city=tashkent&__build=b1&__locale=');
  });

  it('keeps the feed, a deal and a business for guests only', () => {
    for (const path of ['/api/v1/feed?city=tashkent', '/api/v1/deals/osh-1', '/api/v1/businesses/kafe']) {
      expect(apiCacheKey(call(path), 'b1'), path).not.toBeNull();
      expect(apiCacheKey(call(path, { authorization: 'Bearer abcdefghijklmnopqrstu' }), 'b1'), path).toBeNull();
      expect(apiCacheKey(call(path, { cookie: 'bb_session=abc' }), 'b1'), path).toBeNull();
    }
  });

  it('never caches writes, personal answers or answers for a location', () => {
    expect(apiCacheKey(call('/api/v1/deals/deal-1/view', {}, 'POST'), 'b1')).toBeNull();
    expect(apiCacheKey(call('/api/v1/deals/deal-1/redemptions', {}, 'POST'), 'b1')).toBeNull();
    for (const path of ['/api/v1/me', '/api/v1/me/redemptions', '/api/v1/me/avatar', '/api/v1/business/biz', '/api/v1/admin', '/api/v1/auth/telegram/status']) {
      expect(apiCacheKey(call(path), 'b1'), path).toBeNull();
    }
    expect(apiCacheKey(call('/api/v1/feed?lat=41.3&lng=69.2'), 'b1')).toBeNull();
    expect(apiCacheKey(call('/api/v1/deals?sort=near&lat=41.3&lng=69.2'), 'b1')).toBeNull();
  });

  it('stores only complete JSON answers without cookies', () => {
    const json = { 'content-type': 'application/json' };
    expect(cacheableApi(new Response('{}', { headers: json }))).toBe(true);
    expect(cacheableApi(new Response('{}', { status: 404, headers: json }))).toBe(false);
    expect(cacheableApi(new Response('{}', { headers: { ...json, 'set-cookie': 'bb_city=tashkent' } }))).toBe(false);
    expect(cacheableApi(new Response('<p>', { headers: { 'content-type': 'text/html' } }))).toBe(false);
  });

  it('serves a fresh copy as is and renews a stale one', () => {
    expect(cacheState(1_000, 30, 1_000 + 30_000)).toBe('HIT');
    expect(cacheState(1_000, 30, 1_000 + 30_001)).toBe('STALE');
    expect(cacheState(0, 30, Date.now())).toBe('STALE');
  });
});
