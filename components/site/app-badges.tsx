import { Play, Smartphone } from 'lucide-react';

import type { Dictionary } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const badge = 'inline-flex h-14 min-w-[190px] items-center gap-3 rounded-2xl px-4 text-left';

/**
 * The phone app's buttons: "Android ilova" opens Google Play once an admin
 * says the app is live there (until then it reads "coming soon"); the App
 * Store is "coming soon".
 */
export function AppBadges({ android, t, className }: { android: string | null; t: Dictionary; className?: string }) {
  const s = t.appStores;
  const line = (small: string, big: string, muted: boolean) => (
    <span className="leading-tight">
      <span className={cn('block text-xs font-semibold', muted ? 'text-slate-500' : 'text-slate-300')}>{small}</span>
      <span className="block text-base font-black">{big}</span>
    </span>
  );
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {android ? (
        <a
          href={android}
          target="_blank"
          rel="noopener"
          className={cn(badge, 'bg-navy text-white transition hover:bg-navy-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary')}
        >
          <Play className="size-6 shrink-0 fill-current" aria-hidden />
          {line(s.getOnPlay, s.android, false)}
        </a>
      ) : (
        <span className={cn(badge, 'border border-slate-200 bg-white text-navy')}>
          <Play className="size-6 shrink-0 text-slate-400" aria-hidden />
          {line(s.playSoon, s.android, true)}
        </span>
      )}
      <span className={cn(badge, 'border border-slate-200 bg-white text-navy')}>
        <Smartphone className="size-6 shrink-0 text-slate-400" aria-hidden />
        {line(s.soon, s.appStore, true)}
      </span>
    </div>
  );
}
