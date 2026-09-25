import { tashkentParts } from '@/lib/time';

export type WorkingHours = { open: string; close: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTime(value: string) {
  return TIME.test(value);
}

/** Reads `{"open":"10:00","close":"23:00"}` and the legacy `{"mon-sun":"10:00-23:00"}` shape. */
export function parseHours(json: string | null | undefined): WorkingHours | null {
  if (!json) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.open === 'string' && typeof record.close === 'string' && isTime(record.open) && isTime(record.close)) {
    return { open: record.open, close: record.close };
  }
  for (const entry of Object.values(record)) {
    if (typeof entry !== 'string') continue;
    const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(entry.trim());
    if (match && isTime(match[1]) && isTime(match[2])) return { open: match[1], close: match[2] };
  }
  return null;
}

export function serializeHours(hours: WorkingHours) {
  return JSON.stringify({ open: hours.open, close: hours.close });
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Handles overnight hours such as 18:00–02:00 and 24h (open === close). */
export function isOpenAt(hours: WorkingHours, date: Date) {
  const parts = tashkentParts(date);
  const current = parts.hour * 60 + parts.minute;
  const open = minutesOf(hours.open);
  const close = minutesOf(hours.close);
  if (open === close) return true;
  return open < close ? current >= open && current < close : current >= open || current < close;
}
