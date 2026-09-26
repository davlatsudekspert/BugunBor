import { parseHours, openState } from '@/lib/hours';
import type { Dictionary } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

/** "Ochiq · 23:00 gacha" / "Yopiq · 09:00 da ochiladi" for a branch right now. */
export function OpenBadge({ hoursJson, t, now = new Date(), className }: { hoursJson: string | null | undefined; t: Dictionary; now?: Date; className?: string }) {
  const state = openState(parseHours(hoursJson), now);
  if (!state) return null;
  const text = state.open ? (state.until ? fmt(t.deal.openUntil, { time: state.until }) : t.deal.openNow) : fmt(t.deal.closedNow, { time: state.opensAt });
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', state.open ? 'text-emerald-700' : 'text-slate-500', className)}>
      <span aria-hidden className={cn('size-2 rounded-full', state.open ? 'bg-emerald-500' : 'bg-slate-400')} />
      {text}
    </span>
  );
}
