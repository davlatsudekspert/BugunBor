import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Read-only star row; `value` is 0–5 and may be fractional. Screen readers hear
 * "4,7 / 5", unless the rating is written out next to it (`decorative`).
 */
export function RatingStars({ value, className, decorative = false }: { value: number; className?: string; decorative?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-hidden={decorative || undefined}>
      {decorative ? null : <span className="sr-only">{`${(Math.round(value * 10) / 10).toString().replace('.', ',')} / 5`}</span>}
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} aria-hidden className={cn('size-4', value >= star - 0.25 ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}

/** "4,7" from basis points (470). */
export const ratingText = (basisPoints: number) => (basisPoints / 100).toFixed(1).replace('.', ',');
