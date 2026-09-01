import { Star } from 'lucide-react';

/** Read-only star display — five stars, filled up to the rounded rating. Renders nothing if there are no reviews yet. */
export function StarRating({ rating, reviewCount, size = 'sm', hideCount = false }: { rating: number | null; reviewCount: number; size?: 'sm' | 'lg'; hideCount?: boolean }) {
  if (rating === null || reviewCount === 0) return null;
  const rounded = Math.round(rating);
  const starClass = size === 'lg' ? 'size-5' : 'size-3.5';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className={`${starClass} ${index < rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
        ))}
      </span>
      {!hideCount ? <span className={size === 'lg' ? 'text-sm font-bold' : 'text-xs font-bold'}>{rating.toFixed(1)}</span> : null}
      {!hideCount ? <span className={size === 'lg' ? 'text-sm text-slate-500' : 'text-xs text-slate-400'}>({reviewCount} sharh)</span> : null}
    </span>
  );
}
