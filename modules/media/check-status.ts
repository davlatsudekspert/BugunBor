import { tashkentParts, toDbTime } from '@/lib/time';
import { staffAlertStatement } from '@/modules/notifications/service';
import { PHOTO_PROVIDERS, PROVIDER_NAMES, type PhotoCheckResult, type PhotoProvider, type ProviderFailure } from './check';

// What Admin → Sozlamalar shows about the photo check (the last verdict, the
// last failure, how many photos wait for a new try) and the admins' Telegram
// alert when no checking service answers — at most once a day.

const LAST_OK = 'photo_check_last_ok';
const LAST_ERROR = 'photo_check_last_error';

/** A photo that could not be checked is tried again after 15 min, 1 h, 3 h, 6 h, 12 h, then once a day. */
const RETRY_MINUTES = [15, 60, 180, 360, 720, 1440];

export const retryAfter = (failedTries: number, now: Date) =>
  toDbTime(new Date(now.getTime() + RETRY_MINUTES[Math.min(Math.max(failedTries, 1), RETRY_MINUTES.length) - 1] * 60_000));

/** "Claude: HTTP 400 …; Gemini: no answer in 15 s". */
export const describeFailures = (failures: ProviderFailure[]) =>
  failures.map((failure) => `${PROVIDER_NAMES[failure.provider]}: ${failure.error}`).join('; ');

function setting(db: D1Database, key: string, value: unknown, nowDb: string) {
  return db
    .prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES (?1, ?2, ?3)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(key, JSON.stringify(value), nowDb);
}

/** Remembers how a check went: the service that answered, and what failed on the way. */
export function checkRecordStatements(db: D1Database, result: PhotoCheckResult, nowDb: string) {
  const statements: D1PreparedStatement[] = [];
  if (result.failures.length) statements.push(setting(db, LAST_ERROR, { at: nowDb, failures: result.failures }, nowDb));
  if (result.status === 'CHECKED') statements.push(setting(db, LAST_OK, { at: nowDb, provider: result.provider }, nowDb));
  return statements;
}

/** Tells the admins that no service answers; the Tashkent date in the key keeps it to once a day. */
export function checkDownAlertStatement(db: D1Database, failures: ProviderFailure[], now: Date) {
  const { year, month, day } = tashkentParts(now);
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return staffAlertStatement(db, { kind: 'PHOTO_CHECK_DOWN', key: date, payload: { errors: describeFailures(failures).slice(0, 600) }, nowDb: toDbTime(now) });
}

export type PhotoCheckStatus = {
  lastOk: { at: string; provider: PhotoProvider } | null;
  lastError: { at: string; failures: ProviderFailure[] } | null;
  /** Photos kept unchecked that wait for a new try. */
  waiting: number;
};

function parse<T>(value: string | undefined, valid: (data: T) => boolean): T | null {
  try {
    const data = value ? (JSON.parse(value) as T) : null;
    return data && valid(data) ? data : null;
  } catch {
    return null;
  }
}

export async function photoCheckStatus(db: D1Database): Promise<PhotoCheckStatus> {
  const [rows, waiting] = await Promise.all([
    db.prepare(`SELECT key, value FROM app_settings WHERE key IN (?1, ?2)`).bind(LAST_OK, LAST_ERROR).all<{ key: string; value: string }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM media WHERE check_after IS NOT NULL`).first<{ n: number }>(),
  ]);
  const values = new Map(rows.results.map((row) => [row.key, row.value]));
  return {
    lastOk: parse<PhotoCheckStatus['lastOk'] & object>(values.get(LAST_OK), (data) => typeof data.at === 'string' && (PHOTO_PROVIDERS as readonly string[]).includes(data.provider)),
    lastError: parse<PhotoCheckStatus['lastError'] & object>(values.get(LAST_ERROR), (data) => typeof data.at === 'string' && Array.isArray(data.failures)),
    waiting: waiting?.n ?? 0,
  };
}
