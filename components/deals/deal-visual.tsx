import { photoSrcSet } from '@/lib/photos';
import { dealVisual } from '@/lib/visuals';
import { cn } from '@/lib/utils';

/** Deal cover: the business's own photo, or an emoji on a gradient when there is none. */
export function DealVisual({ visual, categorySlug, photo, priority, sizes = '(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw', className, emojiClassName, children }: {
  visual: string | null;
  categorySlug: string;
  photo?: string | null;
  /** Above-the-fold covers load eagerly. */
  priority?: boolean;
  /** Rendered width, so phones get the smaller file. */
  sizes?: string;
  className?: string;
  emojiClassName?: string;
  children?: React.ReactNode;
}) {
  const { emoji, gradient } = dealVisual(visual, categorySlug);
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', gradient, className)}>
      {photo ? (
        <>
          <img src={photo} srcSet={photoSrcSet(photo)} sizes={sizes} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" className="pointer-events-none absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/15" />
        </>
      ) : (
        <div aria-hidden className={cn('pointer-events-none absolute -bottom-8 -right-4 select-none text-[8.5rem] leading-none drop-shadow-[0_12px_24px_rgba(0,0,0,.18)] transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105', emojiClassName)}>
          {emoji}
        </div>
      )}
      {children}
    </div>
  );
}
