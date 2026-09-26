import { STOCK_PHOTOS } from './stock-photos';

export const mediaUrl = (id: string | null | undefined) => (id ? `/media/${id}` : null);

/** Stock photos per visual: "plov", "plov-2", "plov-3" are all photos of plov. */
const STOCK_BY_VISUAL = new Map<string, string[]>();
for (const [key, photo] of Object.entries(STOCK_PHOTOS)) {
  const visual = key.replace(/-\d+$/, '');
  STOCK_BY_VISUAL.set(visual, [...(STOCK_BY_VISUAL.get(visual) ?? []), photo.src]);
}

function pick<T>(items: T[], seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  return items[(hash >>> 0) % items.length];
}

/**
 * A deal's cover: the business's own photo; demo deals may use a licensed stock
 * photo of the same kind. The slug picks one of the variants, so the demo
 * catalogue does not repeat one photo and a deal always keeps the same one.
 */
export function dealPhotoUrl(deal: { photoId?: string | null; visual?: string | null; isDemo?: boolean | number | null; slug?: string | null }) {
  if (deal.photoId) return mediaUrl(deal.photoId);
  if (!deal.isDemo || !deal.visual) return null;
  const photos = STOCK_BY_VISUAL.get(deal.visual);
  return photos ? pick(photos, deal.slug ?? deal.visual) : null;
}

/** Stock photos come in two widths (1200 and 720 px); uploaded photos in one. */
export function photoSrcSet(src: string) {
  return src.startsWith('/photos/') && src.endsWith('.webp') ? `${src.replace(/\.webp$/, '.sm.webp')} 720w, ${src} 1200w` : undefined;
}
