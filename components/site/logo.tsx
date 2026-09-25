import { cn } from '@/lib/utils';

export function Logo({ label, className, inverted = false }: { label: string; className?: string; inverted?: boolean }) {
  return (
    <a href="/" className={cn('flex shrink-0 items-center gap-2', className)} aria-label={label}>
      <span className="grid size-9 place-items-center rounded-[12px] bg-primary text-lg font-black text-primary-foreground shadow-[0_6px_18px_rgba(245,89,55,.25)]">B</span>
      <span className={cn('text-xl font-black tracking-[-0.04em]', inverted ? 'text-white' : 'text-navy')}>
        Bugun<span className={inverted ? 'text-orange-400' : 'text-primary'}>Bor</span>
      </span>
    </a>
  );
}
