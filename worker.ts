import handler from 'vinext/server/fetch-handler';

import { assetLinks } from '@/lib/app-links';
import { routeLocale } from '@/lib/locale-paths';
import { PAGE_CACHE_SECONDS, STALE_SECONDS, apiCacheKey, cacheState, cacheableApi, cacheablePage, pageCacheKey } from '@/lib/page-cache';
import { serveGuideVideo } from '@/modules/guides';

// The Worker entry: vinext renders the app; guests' public pages and the app's
// public API answers are served from the edge cache (lib/page-cache.ts); /ru/…
// is the same page in Russian (lib/locale-paths.ts).

const BUILD = import.meta.env.VITE_BUILD_STAMP ?? 'dev';
/** Kept only on the stored copy: when it was made, and what the client should be told about caching. */
const CACHED_AT = 'x-cached-at';
const CLIENT_CACHE_CONTROL = 'x-client-cache-control';

function edgeCache(): Cache | undefined {
  return (globalThis as { caches?: { default?: Cache } }).caches?.default;
}

async function store(cache: Cache, key: Request, response: Response) {
  const stored = new Response(response.body, response);
  stored.headers.set(CLIENT_CACHE_CONTROL, response.headers.get('cache-control') ?? 'no-store');
  stored.headers.set(CACHED_AT, String(Date.now()));
  stored.headers.set('cache-control', `public, max-age=${STALE_SECONDS}`);
  await cache.put(key, stored);
}

/**
 * What the visitor gets. Browsers always ask again for a page (a guest may
 * sign in the next second); an API answer keeps its own caching rules.
 */
function forClient(response: Response, state: 'HIT' | 'STALE' | 'MISS', page: boolean) {
  const out = new Response(response.body, response);
  out.headers.set('cache-control', page ? 'private, no-cache' : (response.headers.get(CLIENT_CACHE_CONTROL) ?? response.headers.get('cache-control') ?? 'no-store'));
  out.headers.delete(CLIENT_CACHE_CONTROL);
  out.headers.delete(CACHED_AT);
  out.headers.set('x-page-cache', state);
  return out;
}

async function serve(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
  const pageKey = pageCacheKey(request, BUILD);
  const api = pageKey ? null : apiCacheKey(request, BUILD);
  const entry = pageKey ? { key: pageKey, seconds: PAGE_CACHE_SECONDS, page: true } : api ? { ...api, page: false } : null;
  const cache = entry ? edgeCache() : undefined;
  if (!entry || !cache) return handler.fetch(request, env, ctx);
  const storable = (response: Response) => (entry.page ? cacheablePage(response) : cacheableApi(response));

  const hit = await cache.match(entry.key).catch(() => undefined);
  if (hit) {
    const state = cacheState(Number(hit.headers.get(CACHED_AT) ?? 0), entry.seconds);
    if (state === 'STALE') {
      // A request of its own, so the visitor leaving does not stop the renewal.
      const renew = new Request(request.url, { method: 'GET', headers: request.headers });
      ctx.waitUntil(
        handler
          .fetch(renew, env, ctx)
          .then((fresh: Response) => (storable(fresh) ? store(cache, entry.key, fresh) : undefined))
          .catch(() => undefined),
      );
    }
    return forClient(hit, state, entry.page);
  }

  const response = await handler.fetch(request, env, ctx);
  if (!storable(response)) return response;
  ctx.waitUntil(store(cache, entry.key, response.clone()).catch(() => undefined));
  return forClient(response, 'MISS', entry.page);
}

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname === '/.well-known/assetlinks.json') {
      return Response.json(assetLinks(env.ANDROID_CERT_SHA256), { headers: { 'cache-control': 'public, max-age=3600' } });
    }
    const video = await serveGuideVideo(request, env.ASSETS);
    if (video) return video;

    const locale = routeLocale(request);
    if (!locale) return serve(request, env, ctx);
    if (locale.kind === 'redirect') return new Response(null, { status: 302, headers: { location: locale.location, 'cache-control': 'no-store' } });
    const response = await serve(locale.request, env, ctx);
    if (!locale.setCookie) return response;
    // The cached copy never carries a cookie; the visitor's language is set on the way out.
    const out = new Response(response.body, response);
    out.headers.append('set-cookie', locale.setCookie);
    return out;
  },
} satisfies ExportedHandler<Cloudflare.Env>;
