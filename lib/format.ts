import { parseHours } from '@/lib/hours';
import type { Dictionary } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/config';
import { formatClock, tashkentParts } from '@/lib/time';

/** "Har kuni 10:00–23:00", "Kechayu kunduz" or null when unknown. */
export function formatWorkingHours(json: string | null | undefined, t: Dictionary) {
  const hours = parseHours(json);
  if (!hours) return null;
  if (hours.open === hours.close) return t.deal.aroundTheClock;
  return fmt(t.deal.everyDay, { from: hours.open, to: hours.close });
}

const NBSP = ' ';

export function formatNumber(value: number) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return sign + Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatSum(value: number, t: Dictionary) {
  return `${formatNumber(value)}${NBSP}${t.common.sum}`;
}

/** "25-sentabr" / "25 сентября" in Tashkent time. */
export function formatDay(date: Date, t: Dictionary, locale: 'uz' | 'ru') {
  const parts = tashkentParts(date);
  const month = t.months[parts.month - 1];
  return locale === 'ru' ? `${parts.day} ${month}` : `${parts.day}-${month}`;
}

/** "Bugun, 18:30", "Ertaga, 10:00" or "25-sentabr, 18:30". */
export function formatMoment(date: Date, t: Dictionary, locale: 'uz' | 'ru', now = new Date()) {
  const target = tashkentParts(date);
  const dayDiff = Math.round(
    (Date.UTC(target.year, target.month - 1, target.day) - Date.UTC(tashkentParts(now).year, tashkentParts(now).month - 1, tashkentParts(now).day)) / 86400000,
  );
  const day = dayDiff === 0 ? t.common.today : dayDiff === 1 ? t.common.tomorrow : dayDiff === -1 ? t.common.yesterday : formatDay(date, t, locale);
  return fmt(t.common.at, { day, time: formatClock(date) });
}

export function formatDurationMinutes(minutes: number, t: Dictionary) {
  if (minutes % 1440 === 0) return fmt(t.common.daysShort, { count: minutes / 1440 });
  if (minutes % 60 === 0) return fmt(t.common.hoursShort, { count: minutes / 60 });
  return fmt(t.common.minutesShort, { count: minutes });
}

/** +998 90 123 45 67 */
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
}

/** +998 90 *** ** 67 — what business staff see about a customer. */
export function maskPhone(phone: string | null | undefined) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '***';
  if (digits.length === 12 && digits.startsWith('998')) return `+998 ${digits.slice(3, 5)} *** ** ${digits.slice(10)}`;
  return `+${digits.slice(0, 3)} *** ${digits.slice(-2)}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
