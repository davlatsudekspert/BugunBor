import { ANDROID_PACKAGE } from '@/lib/app-links';

// Where the site sends people for the phone app. An admin chooses it in
// Admin → Sozlamalar → "Mobil ilova": not yet ("coming soon"), the APK from
// this site (the latest GitHub release of this public repository, made by the
// owner's "publish APK" workflow), or Google Play once the app is live there.

export const ANDROID_MODE_SETTING = 'android_download';
export const ANDROID_MODES = ['off', 'apk', 'play'] as const;
export type AndroidMode = (typeof ANDROID_MODES)[number];

export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
/** The download page with the install steps. */
export const APP_PAGE = '/ilova';
/** Always the newest release: the workflow names its files this way. */
export const APK_RELEASE_BASE = 'https://github.com/davlatsudekspert/BugunBor/releases/latest/download';
export const APK_FILES = { arm64: 'BugunBor-arm64.apk', armv7: 'BugunBor-armv7.apk' } as const;

/** `android` is where the Android button goes (null: "coming soon"). */
export type AppStores = { mode: AndroidMode; android: string | null };

// Read on every page (the footer), so the choice is kept for half a minute per database.
const cache = new WeakMap<D1Database, { stores: AppStores; at: number }>();
const CACHE_MS = 30_000;

export function storesFor(mode: AndroidMode): AppStores {
  return { mode, android: mode === 'play' ? GOOGLE_PLAY_URL : mode === 'apk' ? APP_PAGE : null };
}

export async function appStores(db: D1Database): Promise<AppStores> {
  const hit = cache.get(db);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.stores;
  const row = await db.prepare(`SELECT value FROM app_settings WHERE key = ?1`).bind(ANDROID_MODE_SETTING).first<{ value: string }>().catch(() => null);
  const mode = (ANDROID_MODES as readonly string[]).includes(row?.value ?? '') ? (row!.value as AndroidMode) : 'off';
  const stores = storesFor(mode);
  cache.set(db, { stores, at: Date.now() });
  return stores;
}

export function forgetAppStores(db: D1Database) {
  cache.delete(db);
}

// The newest published APK: its build (the run number ending the release tag,
// e.g. app-v1.0.0-45) comes from GitHub's "latest release" redirect, which is
// not rate-limited like the API. Remembered for ten minutes; on a network
// error the last known build stays.
const RELEASES_LATEST = 'https://github.com/davlatsudekspert/BugunBor/releases/latest';
const LATEST_MS = 10 * 60_000;
let latest: { build: number | null; at: number } | null = null;

export async function latestApkBuild(fetcher: typeof fetch = fetch, now = Date.now()): Promise<number | null> {
  if (latest && now - latest.at < LATEST_MS) return latest.build;
  let build = latest?.build ?? null;
  try {
    const response = await fetcher(RELEASES_LATEST, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(2500) });
    const match = /\/releases\/tag\/app-v[^/]*-(\d+)$/.exec(response.headers.get('location') ?? '');
    build = match ? Number(match[1]) : response.status === 404 ? null : build;
  } catch {
    // GitHub unreachable: keep what was known.
  }
  latest = { build, at: now };
  return build;
}

export function forgetLatestApk() {
  latest = null;
}
