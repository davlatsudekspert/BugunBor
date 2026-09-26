// The video guides on bugunbor.uz/qollanma (Profile → «Qo‘llanma» in the app
// opens the same page): short recordings of the app, 1080×1920, in Uzbek.
// The files are in public/qollanma; their titles are in the dictionaries.

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

export const guideVideo = (slug: string) => `${GUIDES_PAGE}/${slug}.mp4`;
export const guidePoster = (slug: string) => `${GUIDES_PAGE}/${slug}.jpg`;
/** The steps the picture shows, as Uzbek captions (the videos have no sound). */
export const guideCaptions = (slug: string) => `${GUIDES_PAGE}/${slug}.vtt`;

/** 66 → "1:06". */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
/** 66 → "PT1M6S", the length as search engines read it. */
export const isoDuration = (seconds: number) => `PT${seconds >= 60 ? `${Math.floor(seconds / 60)}M` : ''}${seconds % 60}S`;
