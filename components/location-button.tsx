'use client';

import { useState } from 'react';
import { LoaderCircle, LocateFixed } from 'lucide-react';

/** Section 3 of the product spec: "Mening joylashuvimdan foydalanish". Reads the
 * browser's geolocation and reloads /discover centered on it, keeping any other
 * filters already in the URL. */
export function LocationButton({ radiusKm = 5 }: { radiusKm?: number }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setState('error');
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const url = new URL(
          window.location.href.replace(/^\//, window.location.origin),
        );
        url.pathname = '/discover';
        url.searchParams.set('lat', String(position.coords.latitude));
        url.searchParams.set('lng', String(position.coords.longitude));
        url.searchParams.set('radiusKm', String(radiusKm));
        window.location.href = url.pathname + url.search;
      },
      () => setState('error'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <button
      type="button"
      onClick={useMyLocation}
      disabled={state === 'loading'}
      className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-primary hover:text-primary disabled:opacity-60"
    >
      {state === 'loading' ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <LocateFixed className="size-4 text-primary" />
      )}
      Mening joylashuvim
      {state === 'error' ? (
        <span className="text-xs font-semibold text-red-600">
          Ruxsat berilmadi
        </span>
      ) : null}
    </button>
  );
}
