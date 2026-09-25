import { getDb } from '@/db/client';
import { getMedia, isMediaId } from '@/modules/media/service';

// Uploaded photos. An id never changes its content, so responses are cached
// for a year in browsers and, where available, in the edge cache.
const IMMUTABLE = 'public, max-age=31536000, immutable';

type EdgeCache = { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<void> };

function edgeCache(): EdgeCache | null {
  const store = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return store?.default ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isMediaId(id)) return new Response('Not found', { status: 404 });
  const cache = edgeCache();
  const cacheKey = new Request(new URL(`/media/${id}`, request.url).toString());
  const cached = await cache?.match(cacheKey).catch(() => undefined);
  // Cached responses have immutable headers; the framework still adds its own.
  if (cached) return new Response(cached.body, cached);

  const media = await getMedia(await getDb(), id);
  if (!media) return new Response('Not found', { status: 404, headers: { 'cache-control': 'public, max-age=60' } });
  if (request.headers.get('if-none-match') === media.etag) return new Response(null, { status: 304, headers: { etag: media.etag, 'cache-control': IMMUTABLE } });

  const response = new Response(media.bytes, {
    headers: {
      'content-type': media.mime,
      'content-length': String(media.bytes.length),
      'cache-control': IMMUTABLE,
      etag: media.etag,
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
  await cache?.put(cacheKey, response.clone()).catch(() => undefined);
  return response;
}
