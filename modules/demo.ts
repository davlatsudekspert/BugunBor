import { getConfig } from '@/lib/env';

// The fictional demo catalogue is shown in development, with DEMO_SEED=true,
// or when an admin switches it on (Admin → Sozlamalar). Demo deals are always
// labelled and can never be claimed outside development.

export const DEMO_SETTING = 'demo_mode';

// Read on every page, so the switch is kept for half a minute per database.
const cache = new WeakMap<D1Database, { on: boolean; at: number }>();
const CACHE_MS = 30_000;

export async function demoEnabled(db: D1Database): Promise<boolean> {
  if (getConfig().demoMode) return true;
  const hit = cache.get(db);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.on;
  const row = await db.prepare(`SELECT value FROM app_settings WHERE key = ?1`).bind(DEMO_SETTING).first<{ value: string }>().catch(() => null);
  const on = row?.value === '1';
  cache.set(db, { on, at: Date.now() });
  return on;
}

export function forgetDemoSetting(db: D1Database) {
  cache.delete(db);
}
