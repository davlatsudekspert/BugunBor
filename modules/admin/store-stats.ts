import type { AppConfig } from '@/lib/env';
import { toDbTime } from '@/lib/time';

// Download counts for the admin panel. The server never sees a download: the
// stores count them. App Store Connect's daily sales report (units with the
// "first download" product types) and the Play Console's installs report
// (daily user installs, read from its Cloud Storage bucket) are fetched a day
// at a time and kept in store_downloads; the panel sums them.

export const APPLE_APP_ID = '6821543877';
export const ANDROID_PACKAGE = 'uz.bugunbor.app';
/** The first day with an App Store download (the app went live on 2026-10-18). */
const APPLE_SINCE = '2026-10-17';
const PLAY_SINCE = '2026-10-01';
/** How long the stored numbers are good for before the stores are asked again. */
const FRESH_MS = 6 * 60 * 60_000;
/** Apple reports are read one day per request; at most this many per refresh (the rest next time). */
const APPLE_DAYS_PER_REFRESH = 8;

export type StoreName = 'apple' | 'play';
export type StoreSummary = { total: number; last7: number; last30: number; days: number; updatedAt: string | null; error: string | null };
export type Downloads = { apple: StoreSummary | null; play: StoreSummary | null };

const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array | string) => {
  const raw = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};
function pemToDer(pem: string) {
  const body = pem.replaceAll('\\n', '\n').replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

async function signJwt(header: object, claims: object, key: CryptoKey, algorithm: AlgorithmIdentifier | EcdsaParams) {
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = new Uint8Array(await crypto.subtle.sign(algorithm, key, encoder.encode(unsigned)));
  return `${unsigned}.${base64url(signature)}`;
}

/** App Store Connect's bearer token (ES256, 20 minutes). */
export async function appStoreConnectToken(apple: NonNullable<AppConfig['stores']['apple']>, now = new Date()) {
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(apple.privateKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const iat = Math.floor(now.getTime() / 1000);
  return signJwt({ alg: 'ES256', kid: apple.keyId, typ: 'JWT' }, { iss: apple.issuerId, iat, exp: iat + 20 * 60, aud: 'appstoreconnect-v1' }, key, { name: 'ECDSA', hash: 'SHA-256' });
}

/** A Google access token that may read the Play stats bucket. */
export async function playStorageToken(serviceAccountJson: string, fetcher: typeof fetch, now = new Date()) {
  const account = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string };
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const iat = Math.floor(now.getTime() / 1000);
  const assertion = await signJwt(
    { alg: 'RS256', typ: 'JWT' },
    { iss: account.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_only', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 },
    key,
    'RSASSA-PKCS1-v1_5',
  );
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Google token: HTTP ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

/** Apple's "first download" product types (not updates, not re-downloads). */
const FIRST_DOWNLOAD = new Set(['1', '1F', '1T', '1E', '1EP', '1EU', 'F1']);

/** Units in a daily SALES/SUMMARY report (tab-separated) for this app, by product type. */
export function parseAppleSalesReport(tsv: string, appId = APPLE_APP_ID) {
  const lines = tsv.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { downloads: 0 };
  const header = lines[0].split('\t');
  const column = (name: string) => header.findIndex((cell) => cell.trim().toLowerCase() === name);
  const type = column('product type identifier'), units = column('units'), id = column('apple identifier');
  if (type < 0 || units < 0 || id < 0) throw new Error('Apple report: unexpected columns');
  let downloads = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    if (cells[id]?.trim() !== appId || !FIRST_DOWNLOAD.has(cells[type]?.trim())) continue;
    downloads += Number.parseInt(cells[units] ?? '0', 10) || 0;
  }
  return { downloads };
}

/** One day's downloads from App Store Connect; null when Apple has no report for that day yet. */
export async function fetchAppleDay(apple: NonNullable<AppConfig['stores']['apple']>, day: string, fetcher: typeof fetch, now = new Date()) {
  const query = new URLSearchParams({
    'filter[frequency]': 'DAILY', 'filter[reportDate]': day, 'filter[reportSubType]': 'SUMMARY', 'filter[reportType]': 'SALES', 'filter[vendorNumber]': apple.vendorNumber,
  });
  const response = await fetcher(`https://api.appstoreconnect.apple.com/v1/salesReports?${query}`, {
    headers: { authorization: `Bearer ${await appStoreConnectToken(apple, now)}`, accept: 'application/a-gzip' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`App Store Connect: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  // Gzipped unless Apple (or a test) sends the text itself.
  const text = bytes[0] === 0x1f && bytes[1] === 0x8b ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(bytes);
  return parseAppleSalesReport(text).downloads;
}

/** Daily user installs per day from a Play Console installs overview CSV (UTF-16 or UTF-8). */
export function parsePlayInstallsCsv(bytes: Uint8Array, packageName = ANDROID_PACKAGE) {
  const utf16 = bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[1] === 0 && bytes[3] === 0));
  const text = new TextDecoder(utf16 ? 'utf-16le' : 'utf-8').decode(bytes).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return new Map<string, number>();
  const header = lines[0].split(',').map((cell) => cell.trim().toLowerCase());
  const date = header.indexOf('date'), pkg = header.indexOf('package name');
  const installs = header.findIndex((cell) => cell === 'daily user installs' || cell === 'user installs');
  if (date < 0 || installs < 0) throw new Error('Play report: unexpected columns');
  const days = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    if (pkg >= 0 && cells[pkg]?.trim() !== packageName) continue;
    const day = cells[date]?.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    days.set(day, Number.parseInt(cells[installs] ?? '0', 10) || 0);
  }
  return days;
}

/** The installs of one month (YYYYMM) from the stats bucket; null when the file is not there yet. */
export async function fetchPlayMonth(play: NonNullable<AppConfig['stores']['play']>, month: string, token: string, fetcher: typeof fetch) {
  const object = encodeURIComponent(`stats/installs/installs_${ANDROID_PACKAGE}_${month}_overview.csv`);
  const response = await fetcher(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(play.bucket)}/o/${object}?alt=media`, { headers: { authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Play stats: HTTP ${response.status}`);
  return parsePlayInstallsCsv(new Uint8Array(await response.arrayBuffer()));
}

const dayOf = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (day: string, count: number) => dayOf(new Date(Date.parse(`${day}T00:00:00Z`) + count * 86_400_000));
const monthsBetween = (sinceDay: string, now: Date) => {
  const months: string[] = [];
  for (let date = new Date(`${sinceDay.slice(0, 7)}-01T00:00:00Z`); date <= now; date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))) {
    months.push(`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
};

async function state(db: D1Database, store: StoreName) {
  const row = await db.prepare(`SELECT value FROM app_settings WHERE key = ?1`).bind(`store_stats_${store}`).first<{ value: string }>();
  try {
    return row ? (JSON.parse(row.value) as { at: string; error: string | null }) : null;
  } catch {
    return null;
  }
}

async function remember(db: D1Database, store: StoreName, error: string | null, now: Date) {
  const nowDb = toDbTime(now);
  await db
    .prepare(`INSERT INTO app_settings(key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, NULL) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(`store_stats_${store}`, JSON.stringify({ at: nowDb, error }), nowDb)
    .run();
}

async function write(db: D1Database, store: StoreName, days: Iterable<[string, number]>, now: Date) {
  const nowDb = toDbTime(now);
  const statements = [...days].map(([day, units]) =>
    db.prepare(`INSERT INTO store_downloads(store, day, units, fetched_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(store, day) DO UPDATE SET units = excluded.units, fetched_at = excluded.fetched_at`).bind(store, day, units, nowDb),
  );
  if (statements.length) await db.batch(statements);
}

/**
 * Asks the stores for the days not stored yet, when the stored numbers are
 * older than FRESH_MS. A store's failure is kept as its error (the panel
 * shows it) and never fails the caller.
 */
export async function refreshStoreDownloads(db: D1Database, stores: AppConfig['stores'], fetcher: typeof fetch = fetch, now = new Date()) {
  const yesterday = addDays(dayOf(now), -1);
  if (stores.apple) {
    const last = await state(db, 'apple');
    if (!last || now.getTime() - Date.parse(`${last.at.replace(' ', 'T')}Z`) > FRESH_MS) {
      try {
        const latest = await db.prepare(`SELECT MAX(day) AS day FROM store_downloads WHERE store = 'apple'`).first<{ day: string | null }>();
        let day = latest?.day ? addDays(latest.day, 1) : APPLE_SINCE;
        const days: Array<[string, number]> = [];
        for (let count = 0; day <= yesterday && count < APPLE_DAYS_PER_REFRESH; count++, day = addDays(day, 1)) {
          const units = await fetchAppleDay(stores.apple, day, fetcher, now);
          // No report yet for a recent day: Apple writes it later; stop here.
          if (units === null) {
            if (day >= addDays(yesterday, -2)) break;
            days.push([day, 0]);
            continue;
          }
          days.push([day, units]);
        }
        await write(db, 'apple', days, now);
        await remember(db, 'apple', null, now);
      } catch (error) {
        await remember(db, 'apple', error instanceof Error ? error.message : 'unknown', now);
      }
    }
  }
  if (stores.play) {
    const last = await state(db, 'play');
    if (!last || now.getTime() - Date.parse(`${last.at.replace(' ', 'T')}Z`) > FRESH_MS) {
      try {
        const token = await playStorageToken(stores.play.serviceAccount, fetcher, now);
        const latest = await db.prepare(`SELECT MAX(day) AS day FROM store_downloads WHERE store = 'play'`).first<{ day: string | null }>();
        // Monthly files grow day by day: the current month (and the one before, at the start of a month) is read again.
        const since = latest?.day ? addDays(latest.day, -7) : PLAY_SINCE;
        for (const month of monthsBetween(since, now)) {
          const days = await fetchPlayMonth(stores.play, month, token, fetcher);
          if (days) await write(db, 'play', days, now);
        }
        await remember(db, 'play', null, now);
      } catch (error) {
        await remember(db, 'play', error instanceof Error ? error.message : 'unknown', now);
      }
    }
  }
}

/** The stored counts, summed; null for a store that is not set up. */
export async function storeDownloads(db: D1Database, stores: AppConfig['stores'], now = new Date()): Promise<Downloads> {
  const summary = async (store: StoreName): Promise<StoreSummary> => {
    const today = dayOf(now);
    const row = await db
      .prepare(`SELECT COALESCE(SUM(units), 0) AS total, COALESCE(SUM(CASE WHEN day >= ?2 THEN units END), 0) AS last7,
          COALESCE(SUM(CASE WHEN day >= ?3 THEN units END), 0) AS last30, COUNT(*) AS days FROM store_downloads WHERE store = ?1`)
      .bind(store, addDays(today, -7), addDays(today, -30))
      .first<{ total: number; last7: number; last30: number; days: number }>();
    const last = await state(db, store);
    return { total: row?.total ?? 0, last7: row?.last7 ?? 0, last30: row?.last30 ?? 0, days: row?.days ?? 0, updatedAt: last?.at ?? null, error: last?.error ?? null };
  };
  return { apple: stores.apple ? await summary('apple') : null, play: stores.play ? await summary('play') : null };
}
