'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Coords = { latitude: number; longitude: number };
type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';
type LocationState = { coords: Coords | null; status: LocationStatus; request: () => void };

const LocationContext = createContext<LocationState | null>(null);

/**
 * A single shared browser-geolocation permission for the whole page: every
 * "mening joylashuvim" button and distance badge reads from here, so the
 * browser only ever prompts once no matter how many components ask.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setStatus('granted');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const value = useMemo(() => ({ coords, status, request }), [coords, status, request]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within a LocationProvider');
  return context;
}
