import handler from 'vinext/server/fetch-handler';

import { assetLinks } from '@/lib/app-links';
import { PAGE_CACHE_SECONDS, cacheablePage, pageCacheKey } from '@/lib/page-cache';
import { serveGuideVideo } from '@/modules/guides';

// The Worker entry: vinext renders the app; guests' public pages are served
// from the edge cache for a few seconds (lib/page-cache.ts).

const BUILD = import.meta.env.VITE_BUILD_STAMP ?? 'dev';

function edgeCache(): Cache | undefined {
  return (globalThis as { caches?: { default?: Cache } }).caches?.default;
}

/** Browsers always ask again (a guest may sign in the next second); only the edge keeps the page. */
function forBrowser(response: Response, state: 'HIT' | 'MISS') {
  const out = new Response(response.body, response);
  out.headers.set('cache-control', 'private, no-cache');
  out.headers.set('x-page-cache', state);
  return out;
}

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname === '/.well-known/assetlinks.json') {
      return Response.json(assetLinks(env.ANDROID_CERT_SHA256), { headers: { 'cache-control': 'public, max-age=3600' } });
    }
    const video = await serveGuideVideo(request, env.ASSETS);
    if (video) return video;
    const key = pageCacheKey(request, BUILD);
    const cache = key ? edgeCache() : undefined;
    if (!key || !cache) return handler.fetch(request, env, ctx);

    const hit = await cache.match(key).catch(() => undefined);
    if (hit) return forBrowser(hit, 'HIT');

    const response = await handler.fetch(request, env, ctx);
    if (!cacheablePage(response)) return response;
    const stored = new Response(response.clone().body, response);
    stored.headers.set('cache-control', `public, max-age=${PAGE_CACHE_SECONDS}`);
    ctx.waitUntil(cache.put(key, stored).catch(() => undefined));
    return forBrowser(response, 'MISS');
  },
} satisfies ExportedHandler<Cloudflare.Env>;
