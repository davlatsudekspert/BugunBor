// The video guides on bugunbor.uz/qollanma (Profile → «Qo‘llanma» in the app
// opens the same page): short recordings of the app, 1080×1920, in Uzbek.
// The files are in public/qollanma; their titles are in the dictionaries.

import { rangeResponse } from '@/lib/byte-range';

export const GUIDES_PAGE = '/qollanma';

export const PROMO = { slug: 'nima-uchun-bugunbor', seconds: 25 } as const;
/** The step-by-step series, in the order it is watched. */
export const GUIDES = [
  { slug: '1-ilovani-yuklab-olish', seconds: 66 },
  { slug: '2-royxatdan-otish', seconds: 40 },
  { slug: '3-biznes-qoshish', seconds: 46 },
  { slug: '4-aksiya-qoshish', seconds: 66 },
] as const;
export type GuideSlug = (typeof GUIDES)[number]['slug'];
/** Shows the APK being downloaded, so it is listed only while the site serves the APK. */
export const APK_GUIDE: GuideSlug = '1-ilovani-yuklab-olish';

/** The file in public/qollanma (sent whole, as every static file is). */
export const guideFile = (slug: string) => `${GUIDES_PAGE}/${slug}.mp4`;
/** What players load: the same file through the Worker, which can send it in parts (Safari needs that). */
export const guideVideo = (slug: string) => `${GUIDES_PAGE}/video/${slug}.mp4`;
export const guidePoster = (slug: string) => `${GUIDES_PAGE}/${slug}.jpg`;
/** The steps the picture shows, as Uzbek captions (the videos have no sound). */
export const guideCaptions = (slug: string) => `${GUIDES_PAGE}/${slug}.vtt`;

/** 66 → "1:06". */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
/** 66 → "PT1M6S", the length as search engines read it. */
export const isoDuration = (seconds: number) => `PT${seconds >= 60 ? `${Math.floor(seconds / 60)}M` : ''}${seconds % 60}S`;

const VIDEO_PATH = /^\/qollanma\/video\/([a-z0-9-]+)\.mp4$/;
const SLUGS = new Set<string>([PROMO.slug, ...GUIDES.map((guide) => guide.slug)]);

/**
 * A guide video for a player, in parts when asked (the Worker's route for
 * guideVideo). Without the static files binding it points to the whole file.
 */
export async function serveGuideVideo(request: Request, assets: Fetcher | undefined): Promise<Response | null> {
  const url = new URL(request.url);
  const slug = VIDEO_PATH.exec(url.pathname)?.[1];
  if (!slug) return null;
  if (!SLUGS.has(slug) || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
  const file = new URL(guideFile(slug), url);
  if (!assets) return Response.redirect(file.toString(), 302);
  return rangeResponse(request, await assets.fetch(new Request(file)), 'public, max-age=86400, stale-while-revalidate=604800');
}
