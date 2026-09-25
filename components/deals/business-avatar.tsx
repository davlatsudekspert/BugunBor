import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

/** The business logo, or its initials until a logo is uploaded. */
export function BusinessAvatar({ name, logo, className }: { name: string; logo: string | null; className?: string }) {
  if (logo) return <img src={logo} alt="" loading="lazy" decoding="async" className={cn('shrink-0 object-cover', className)} />;
  return <span aria-hidden className={cn('grid shrink-0 place-items-center', className)}>{initials(name)}</span>;
}
