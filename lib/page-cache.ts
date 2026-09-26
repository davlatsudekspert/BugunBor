// Guests see the same public pages, so a rendered page is kept for a short
// while in Cloudflare's edge cache instead of asking the database again for
// every visitor. Nothing personal is ever cached: not for signed-in visitors
// (session or login cookie), not a response that sets a cookie, not a
// client-side navigation payload (RSC) and not an API call.

export const PAGE_CACHE_SECONDS = 30;

const PUBLIC_PAGES = [
  /^\/$/, /^\/discover$/, /^\/categories(?:\/[a-z0-9-]+)?$/, /^\/deals\/[^/]+$/, /^\/businesses\/[^/]+$/,
  /^\/business$/, /^\/how-it-works$/, /^\/faq$/, /^\/terms$/, /^\/privacy$/, /^\/oferta$/, /^\/credits$/,
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
