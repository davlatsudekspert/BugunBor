/**
 * All timestamps in the database are stored as naive UTC strings with no timezone
 * suffix (SQLite's own `datetime('now')` output, e.g. "2026-08-31 17:29:02", and
 * anything this app writes is normalized to match). Call sites across the app parse
 * them back by appending a literal "Z" — see modules/catalog, modules/redemptions,
 * the moderation route, etc. These two helpers are the single place that boundary is
 * enforced: `parseFlexibleDate` reads a value that may or may not already carry a
 * timezone (client input usually does); `toStoredUtc` converts to the naive form
 * before a value reaches SQL.
 */

const HAS_TIMEZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export function parseFlexibleDate(value: string): Date {
  return new Date(HAS_TIMEZONE.test(value.trim()) ? value : `${value}Z`);
}

export function toStoredUtc(value: string): string {
  return parseFlexibleDate(value).toISOString().replace(/Z$/, '');
}
