import { env } from 'cloudflare:workers';

import { getConfig } from '@/lib/env';
import { applyMigrations } from './migrate';
import { refreshDemoData, seedDemoData } from './seed';

let ready: Promise<void> | undefined;
let lastDemoRefresh = 0;
const DEMO_REFRESH_MS = 5 * 60_000;

function binding(): D1Database {
  if (!env.DB) {
    throw new Error('Cloudflare D1 binding `DB` is unavailable. Check the `d1` field in .openai/hosting.json or wrangler.jsonc.');
  }
  return env.DB;
}

/** The D1 database with all migrations applied (once per isolate). */
export async function getDb(): Promise<D1Database> {
  const db = binding();
  const demo = getConfig().demoMode;
  ready ??= (async () => {
    await applyMigrations(db);
    if (demo) {
      // Demo content must never take the real site down with it.
      await seedDemoData(db).catch((error: unknown) => console.error('Demo seed failed', error));
      lastDemoRefresh = Date.now();
    }
  })().catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  await ready;
  if (demo && Date.now() - lastDemoRefresh > DEMO_REFRESH_MS) {
    lastDemoRefresh = Date.now();
    await refreshDemoData(db).catch((error: unknown) => console.error('Demo refresh failed', error));
  }
  return db;
}
