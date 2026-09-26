'use client';

import { useEffect, useState } from 'react';

import { fmt } from '@/lib/i18n/config';
import { formatCountdown, parseDbTime, secondsUntil } from '@/lib/time';

/** Live HH:MM:SS countdown to a stored UTC time. */
export function Countdown({ target, daysLabel, className }: { target: string; daysLabel: string; className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { days, clock } = formatCountdown(secondsUntil(parseDbTime(target), now));
  return (
    <span className={className} suppressHydrationWarning>
      {days > 0 ? `${fmt(daysLabel, { count: days })} ` : ''}
      {clock}
    </span>
  );
}
