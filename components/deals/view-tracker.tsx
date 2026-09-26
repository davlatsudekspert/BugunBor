'use client';

import { useEffect } from 'react';

/** Counts one view per deal per browser session (prefetches and bots are not counted). */
export function DealViewTracker({ dealId }: { dealId: string }) {
  useEffect(() => {
    const key = `bb_viewed_${dealId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Storage can be unavailable (private mode); counting once per page load is fine then.
    }
    void fetch(`/api/v1/deals/${encodeURIComponent(dealId)}/view`, { method: 'POST', keepalive: true }).catch(() => undefined);
  }, [dealId]);
  return null;
}
