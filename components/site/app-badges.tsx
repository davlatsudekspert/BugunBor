import { Download, Play, Smartphone } from 'lucide-react';

import type { Dictionary } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { AppStores } from '@/modules/app-stores';

const badge = 'inline-flex h-14 min-w-[190px] items-center gap-3 rounded-2xl px-4 text-left';

/**
 * The phone app's buttons: "Android ilova" goes to the site's APK page or to
 * Google Play, as an admin chose (until then it reads "coming soon"); the App
 * Store is "coming soon".
 */
export function AppBadges({ stores, t, className }: { stores: AppStores; t: Dictionary; className?: string }) {
  const s = t.appStores;
  const line = (small: string, big: string, muted: boolean) => (
    <span className="leading-tight">
      <span className={cn('block text-xs font-semibold', muted ? 'text-slate-500' : 'text-slate-300')}>{small}</span>
      <span className="block text-base font-black">{big}</span>
    </span>
  );
  const live = cn(badge, 'bg-navy text-white transition hover:bg-navy-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary');
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {stores.mode === 'play' && stores.android ? (
        <a href={stores.android} target="_blank" rel="noopener" className={live}>
          <Play className="size-6 shrink-0 fill-current" aria-hidden />
          {line(s.getOnPlay, s.android, false)}
        </a>
      ) : stores.mode === 'apk' && stores.android ? (
        <a href={stores.android} className={live}>
          <Download className="size-6 shrink-0" aria-hidden />
          {line(s.getApk, s.android, false)}
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
