import { dealVisual } from '@/lib/visuals';
import { cn } from '@/lib/utils';

/** Illustrated deal cover: an emoji on a gradient, until photo uploads exist. */
export function DealVisual({ visual, categorySlug, className, emojiClassName, children }: {
  visual: string | null;
  categorySlug: string;
  className?: string;
  emojiClassName?: string;
  children?: React.ReactNode;
}) {
  const { emoji, gradient } = dealVisual(visual, categorySlug);
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', gradient, className)}>
      <div aria-hidden className={cn('pointer-events-none absolute -bottom-8 -right-4 select-none text-[8.5rem] leading-none drop-shadow-[0_12px_24px_rgba(0,0,0,.18)] transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105', emojiClassName)}>
        {emoji}
      </div>
      {children}
    </div>
  );
}
