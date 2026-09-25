// All timestamps are stored in UTC using SQLite's canonical `YYYY-MM-DD HH:MM:SS`
// format, which sorts lexicographically and matches CURRENT_TIMESTAMP defaults.
// Uzbekistan has no daylight saving time, so Tashkent is always UTC+5.

export const TASHKENT_OFFSET_MINUTES = 5 * 60;
const TASHKENT_OFFSET_MS = TASHKENT_OFFSET_MINUTES * 60 * 1000;

const pad = (value: number, size = 2) => value.toString().padStart(size, '0');

export function toDbTime(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new Error('INVALID_DATE');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function parseDbTime(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed)) {
    return new Date(`${trimmed.replace(' ', 'T')}Z`);
  }
  return new Date(trimmed);
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export type TashkentParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

export function tashkentParts(date: Date): TashkentParts {
  const shifted = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

/** 00:00 of the current day in Tashkent, as a UTC Date. */
export function startOfTashkentDay(date: Date) {
  const parts = tashkentParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - TASHKENT_OFFSET_MS);
}

export function formatClock(date: Date) {
  const parts = tashkentParts(date);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatNumericDate(date: Date) {
  const parts = tashkentParts(date);
  return `${pad(parts.day)}.${pad(parts.month)}.${parts.year}`;
}

export function isSameTashkentDay(a: Date, b: Date) {
  const left = tashkentParts(a);
  const right = tashkentParts(b);
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

/** `2026-09-25T18:30` entered in Tashkent time → UTC Date. */
export function tashkentInputToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute) - TASHKENT_OFFSET_MS;
  const date = new Date(utc);
  const check = tashkentParts(date);
  if (check.year !== year || check.month !== month || check.day !== day || check.hour !== hour || check.minute !== minute) return null;
  return date;
}

/** UTC Date → `2026-09-25T18:30` for a Tashkent `datetime-local` input. */
export function dateToTashkentInput(date: Date) {
  const parts = tashkentParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function secondsUntil(target: Date, now = new Date()) {
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}

export function formatCountdown(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? { days, clock } : { days: 0, clock };
}
