import { ANDROID_PACKAGE } from '@/lib/app-links';

// Where the site sends people for the phone app. The Android button opens
// Google Play once an admin says the app is live there (Admin → Sozlamalar);
// until then, and for the iPhone, the site says "coming soon".

export const ANDROID_STORE_SETTING = 'android_store_live';
export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export type AppStores = { android: string | null };

// Read on every page (the footer), so the switch is kept for half a minute per database.
const cache = new WeakMap<D1Database, { stores: AppStores; at: number }>();
const CACHE_MS = 30_000;

export async function appStores(db: D1Database): Promise<AppStores> {
  const hit = cache.get(db);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.stores;
  const row = await db.prepare(`SELECT value FROM app_settings WHERE key = ?1`).bind(ANDROID_STORE_SETTING).first<{ value: string }>().catch(() => null);
  const stores = { android: row?.value === '1' ? GOOGLE_PLAY_URL : null };
  cache.set(db, { stores, at: Date.now() });
  return stores;
}

export function forgetAppStores(db: D1Database) {
  cache.delete(db);
}
