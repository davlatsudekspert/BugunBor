/** Matches the naive "YYYY-MM-DD HH:MM:SS" UTC format SQLite's own datetime() produces, so stored timestamps stay consistent across every table (read-side code appends 'Z' to them directly). */
export function toStoredUtc(isoWithOffset: string) {
  return new Date(isoWithOffset).toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Uzbekistan runs UTC+5 year-round (no DST), so a datetime-local value picked
 * in a browser can be converted to a real UTC instant by simply appending
 * that fixed offset before parsing.
 */
export function tashkentLocalToUtcIso(datetimeLocalValue: string) {
  return new Date(`${datetimeLocalValue}:00+05:00`).toISOString();
}

/** The inverse: a naive-UTC stored timestamp ("YYYY-MM-DD HH:MM:SS") to a `datetime-local` input value in Tashkent's wall-clock time. */
export function storedUtcToTashkentLocalInput(storedUtc: string) {
  const tashkentMs = new Date(`${storedUtc}Z`).getTime() + 5 * 60 * 60 * 1000;
  return new Date(tashkentMs).toISOString().slice(0, 16);
}
