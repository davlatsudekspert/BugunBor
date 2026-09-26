'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Re-reads the page every few seconds for a while, e.g. until a payment is confirmed. */
export function AutoRefresh({ everyMs = 5000, times = 24 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      if (count >= times) clearInterval(timer);
      router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs, times]);
  return null;
}
