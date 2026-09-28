import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';

// The codes Google Search Console and Yandex Webmaster give to prove the site
// is ours («HTML tag» method): an admin pastes them in Admin → Sozlamalar →
// «Qidiruv tizimlari», and the home page carries them as
// <meta name="google-site-verification"> and <meta name="yandex-verification">.
// Stored in app_settings; empty until set. They are public by nature (anyone
// can read them in the page), so they are no secret.

export const VERIFICATION_KEYS = { google: 'seo_google_verification', yandex: 'seo_yandex_verification' } as const;
export type SearchEngine = keyof typeof VERIFICATION_KEYS;
export type SiteVerification = Record<SearchEngine, string>;

const TAG_NAMES: Record<SearchEngine, string> = { google: 'google-site-verification', yandex: 'yandex-verification' };
const CODE = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * What an admin pastes — the code alone or the whole <meta …> tag — reduced
 * to the code. '' clears it; null means it is not a code for this engine
 * (another engine's tag, or anything else).
 */
export function verificationCode(engine: SearchEngine, pasted: string): string | null {
  const value = pasted.trim();
  if (!value) return '';
  if (value.startsWith('<')) {
    const name = /\bname\s*=\s*["']([^"']*)["']/i.exec(value)?.[1];
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(value)?.[1]?.trim();
    return name?.toLowerCase() === TAG_NAMES[engine] && content && CODE.test(content) ? content : null;
  }
  return CODE.test(value) ? value : null;
}

// The home page reads them on every visit, so they are kept for a minute per database.
const cache = new WeakMap<D1Database, { value: SiteVerification; at: number }>();
const CACHE_MS = 60_000;

export async function siteVerification(db: D1Database, options: { fresh?: boolean } = {}): Promise<SiteVerification> {
  const hit = cache.get(db);
  if (hit && !options.fresh && Date.now() - hit.at < CACHE_MS) return hit.value;
  const rows = await db
    .prepare(`SELECT key, value FROM app_settings WHERE key IN (?1, ?2)`)
    .bind(VERIFICATION_KEYS.google, VERIFICATION_KEYS.yandex)
    .all<{ key: string; value: string }>();
  const map = new Map(rows.results.map((row) => [row.key, row.value]));
  const value = { google: map.get(VERIFICATION_KEYS.google) ?? '', yandex: map.get(VERIFICATION_KEYS.yandex) ?? '' };
  cache.set(db, { value, at: Date.now() });
  return value;
}

export async function updateSiteVerification(db: D1Database, input: { actorId: string; codes: SiteVerification }, now = new Date()) {
  const nowDb = toDbTime(now);
  await db.batch([
    ...(Object.keys(VERIFICATION_KEYS) as SearchEngine[]).map((engine) =>
      db.prepare(`INSERT INTO app_settings(key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
        .bind(VERIFICATION_KEYS[engine], input.codes[engine], nowDb, input.actorId),
    ),
    auditStatement(db, { actorUserId: input.actorId, action: 'seo.verification', targetType: 'Settings', targetId: 'seo', after: input.codes }, nowDb),
  ]);
  cache.delete(db);
}
