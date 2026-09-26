import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Read-only star row; `value` is 0–5 and may be fractional. */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn('size-4', value >= star - 0.25 ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}

/** "4,7" from basis points (470). */
export const ratingText = (basisPoints: number) => (basisPoints / 100).toFixed(1).replace('.', ',');
