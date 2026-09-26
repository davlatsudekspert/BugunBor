import { getDb } from '@/db/client';
import { getMedia, isMediaId } from '@/modules/media/service';

// Uploaded photos. An id never changes its content, so browsers keep them for
// a year. The edge cache keeps them for a day, so a photo a moderator takes
// down is gone everywhere by the next day (at once in the data centre that
// handled the takedown, see forgetCachedMedia).
const IMMUTABLE = 'public, max-age=31536000, immutable';
const EDGE = 'public, max-age=86400';

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
  if (cached) {
    // The framework still adds its own headers.
    const headers = new Headers(cached.headers);
    headers.set('cache-control', IMMUTABLE);
    return new Response(cached.body, { status: cached.status, headers });
  }

  const media = await getMedia(await getDb(), id);
  if (!media) return new Response('Not found', { status: 404, headers: { 'cache-control': 'public, max-age=60' } });
  if (request.headers.get('if-none-match') === media.etag) return new Response(null, { status: 304, headers: { etag: media.etag, 'cache-control': IMMUTABLE } });

  const headers = (cacheControl: string) => ({
    'content-type': media.mime,
    'content-length': String(media.bytes.length),
    'cache-control': cacheControl,
    etag: media.etag,
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
  });
  await cache?.put(cacheKey, new Response(media.bytes, { headers: headers(EDGE) })).catch(() => undefined);
  return new Response(media.bytes, { headers: headers(IMMUTABLE) });
}
