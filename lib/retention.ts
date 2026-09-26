// How long each kind of record is kept. The privacy policy quotes these
// numbers (lib/privacy.ts), so the published text and the cleanup jobs
// cannot drift apart.
export const RETENTION = {
  /** Ended sessions, finished login requests and rate-limit counters. */
  shortLivedHours: 24,
  /** The Telegram notification queue. */
  notificationDays: 14,
  /** Uploaded photos that no business or deal uses. */
  unusedPhotoHours: 24,
  /** Audit trail, moderation history and contact-form messages. */
  logYears: 5,
} as const;

/** The same calendar day `years` years before `now` (UTC). */
export function yearsBefore(now: Date, years: number) {
  const date = new Date(now.getTime());
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}
