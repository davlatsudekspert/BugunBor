'use client';

import { useEffect, useState } from 'react';

function msUntil(endsAtNaiveUtc: string) {
  return new Date(`${endsAtNaiveUtc}Z`).getTime() - Date.now();
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Tugadi';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  if (days >= 1) return `${days} kun ${hours} soat qoldi`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} qoldi`;
}

/**
 * A live countdown to a deal's `endsAt` (D1's naive UTC timestamp — the appended "Z" matches
 * every other endsAt render in this app). Ticks every second on the client, unlike a
 * server-rendered clock reading or a fixed "ends at HH:MM" label, both of which freeze the
 * instant the page stops being freshly loaded — this is what fixes the "timer qotib qolgan"
 * (frozen timer) complaint: the countdown on a page left open now keeps counting down live.
 */
export function CountdownTimer({ endsAt, className }: { endsAt: string; className?: string }) {
  const [remainingMs, setRemainingMs] = useState(() => msUntil(endsAt));

  useEffect(() => {
    const tick = () => setRemainingMs(msUntil(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // The very first paint (SSR, then the first client render before this effect runs) is
  // computed from whichever clock rendered it — suppress the one-off hydration warning
  // React would otherwise raise for this deliberately clock-like, ever-changing value.
  return (
    <span className={className} suppressHydrationWarning>
      {formatRemaining(remainingMs)}
    </span>
  );
}
