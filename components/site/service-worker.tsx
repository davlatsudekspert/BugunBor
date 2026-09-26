'use client';

import { useEffect } from 'react';

/** Registers the service worker in production builds (offline page, installable app). */
export function ServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
