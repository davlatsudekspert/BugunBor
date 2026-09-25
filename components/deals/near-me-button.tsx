'use client';

import { LoaderCircle, LocateFixed } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type Labels = { nearMe: string; locating: string; denied: string; unsupported: string };

/** Asks for the browser location once and reloads the list sorted by distance. */
export function NearMeButton({ labels, active, className }: { labels: Labels; active: boolean; className?: string }) {
  const [state, setState] = useState<'idle' | 'locating' | 'denied' | 'unsupported'>('idle');

  function locate() {
    if (!('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const url = new URL(window.location.href);
        // ~100 m precision is enough for sorting and keeps the exact position private.
        url.searchParams.set('lat', position.coords.latitude.toFixed(3));
        url.searchParams.set('lng', position.coords.longitude.toFixed(3));
        url.searchParams.set('sort', 'near');
        url.searchParams.delete('city');
        url.searchParams.delete('page');
        window.location.assign(url.toString());
      },
      () => setState('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <button
        type="button"
        onClick={locate}
        disabled={state === 'locating'}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition',
          active ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40',
        )}
      >
        {state === 'locating' ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <LocateFixed className="size-3.5" aria-hidden />}
        {state === 'locating' ? labels.locating : labels.nearMe}
      </button>
      {state === 'denied' || state === 'unsupported' ? (
        <output className="block text-xs font-semibold text-red-600">{state === 'denied' ? labels.denied : labels.unsupported}</output>
      ) : null}
    </div>
  );
}
