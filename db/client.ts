import { env } from 'cloudflare:workers';

import { getConfig } from '@/lib/env';
import { applyMigrations } from './migrate';
import { seedDemoData } from './seed';

let ready: Promise<void> | undefined;

function binding(): D1Database {
  if (!env.DB) {
    throw new Error('Cloudflare D1 binding `DB` is unavailable. Check the `d1` field in .openai/hosting.json or wrangler.jsonc.');
  }
  return env.DB;
}

/** The D1 database with all migrations applied (once per isolate). */
export async function getDb(): Promise<D1Database> {
  const db = binding();
  ready ??= (async () => {
    await applyMigrations(db);
    if (getConfig().demoMode) await seedDemoData(db);
  })().catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  await ready;
  return db;
}
