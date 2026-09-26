// Guests see the same public pages, so a rendered page is kept in Cloudflare's
// edge cache instead of asking the database again for every visitor. Nothing
// personal is ever cached: not for signed-in visitors (session or login
// cookie), not a response that sets a cookie and not a client-side navigation
// payload (RSC). The app's public API answers are kept the same way (below).
//
// A copy is fresh for PAGE_CACHE_SECONDS. After that, and for up to
// STALE_SECONDS, the next visitor still gets it at once while a fresh one is
// made in the background, so a quiet hour never means a slow first page.

export const PAGE_CACHE_SECONDS = 30;
export const STALE_SECONDS = 300;

const PUBLIC_PAGES = [
  /^\/$/, /^\/discover$/, /^\/categories(?:\/[a-z0-9-]+)?$/, /^\/deals\/[^/]+$/, /^\/businesses\/[^/]+$/,
  /^\/business$/, /^\/how-it-works$/, /^\/faq$/, /^\/terms$/, /^\/privacy$/, /^\/oferta$/, /^\/credits$/, /^\/ilova$/, /^\/qollanma$/,
];

/** Cookies that change what a guest sees; they are part of the cache key. */
const VARY_COOKIES = ['bb_locale', 'bb_city'];
/** Cookies that make the page personal; such requests are never cached. */
const PERSONAL_COOKIES = ['bb_session', 'bb_login'];

function readCookies(header: string | null) {
  const cookies = new Map<string, string>();
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0) cookies.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return cookies;
}

/** The cache key for a guest's page view, or null when the request must reach the app. */
export function pageCacheKey(request: Request, build: string): Request | null {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (!PUBLIC_PAGES.some((pattern) => pattern.test(url.pathname))) return null;
  if (request.headers.has('rsc') || request.headers.has('next-router-state-tree') || url.searchParams.has('_rsc')) return null;
  if (!(request.headers.get('accept') ?? '').includes('text/html')) return null;
  const cookies = readCookies(request.headers.get('cookie'));
  if (PERSONAL_COOKIES.some((name) => cookies.has(name))) return null;
  const key = new URL(url.pathname + url.search, url.origin);
  key.searchParams.set('__build', build);
  for (const name of VARY_COOKIES) key.searchParams.set(`__${name}`, cookies.get(name) ?? '');
  return new Request(key.toString(), { method: 'GET' });
}

/** Only complete, cookie-free HTML pages are stored. */
export function cacheablePage(response: Response) {
  return response.status === 200 && !response.headers.has('set-cookie') && (response.headers.get('content-type') ?? '').includes('text/html');
}

/**
 * Public API answers the app asks for on (almost) every start. `everyone`: the
 * answer never depends on who asks, so signed-in requests share it; the others
 * are cached for guests only. Answers for a location (lat/lng) are not cached.
 */
const PUBLIC_API: { pattern: RegExp; seconds: number; everyone?: boolean }[] = [
  { pattern: /^\/api\/v1\/config$/, seconds: 60, everyone: true },
  { pattern: /^\/api\/v1\/deals$/, seconds: PAGE_CACHE_SECONDS, everyone: true },
  { pattern: /^\/api\/v1\/feed$/, seconds: PAGE_CACHE_SECONDS },
  { pattern: /^\/api\/v1\/deals\/[^/]+$/, seconds: PAGE_CACHE_SECONDS },
  { pattern: /^\/api\/v1\/businesses\/[^/]+$/, seconds: PAGE_CACHE_SECONDS },
];

/** The cache key and freshness for a public API call, or null when it must reach the app. */
export function apiCacheKey(request: Request, build: string): { key: Request; seconds: number } | null {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  const rule = PUBLIC_API.find((item) => item.pattern.test(url.pathname));
  if (!rule || url.searchParams.has('lat') || url.searchParams.has('lng')) return null;
  const cookies = readCookies(request.headers.get('cookie'));
  if (!rule.everyone && (request.headers.has('authorization') || PERSONAL_COOKIES.some((name) => cookies.has(name)))) return null;
  const key = new URL(url.pathname + url.search, url.origin);
  key.searchParams.set('__build', build);
  // Error texts follow the language (lib/http.ts requestLocale).
  key.searchParams.set('__locale', cookies.get('bb_locale') ?? request.headers.get('x-locale') ?? '');
  return { key: new Request(key.toString(), { method: 'GET' }), seconds: rule.seconds };
}

/** Only complete JSON answers without cookies are stored. */
export function cacheableApi(response: Response) {
  return response.status === 200 && !response.headers.has('set-cookie') && (response.headers.get('content-type') ?? '').includes('application/json');
}

/** A stored copy is served as it is while fresh, and served but renewed while stale. */
export function cacheState(cachedAt: number, freshSeconds: number, now = Date.now()): 'HIT' | 'STALE' {
  return now - cachedAt <= freshSeconds * 1000 ? 'HIT' : 'STALE';
}
