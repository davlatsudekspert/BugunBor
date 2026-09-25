import { STOCK_PHOTOS } from './stock-photos';

export const mediaUrl = (id: string | null | undefined) => (id ? `/media/${id}` : null);

/** A deal's cover: the business's own photo; demo deals may use a licensed stock photo of the same kind. */
export function dealPhotoUrl(deal: { photoId?: string | null; visual?: string | null; isDemo?: boolean | number | null }) {
  if (deal.photoId) return mediaUrl(deal.photoId);
  if (deal.isDemo && deal.visual) return STOCK_PHOTOS[deal.visual]?.src ?? null;
  return null;
}
