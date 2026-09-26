import { describe, expect, it, vi } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { createTestD1 } from '@/test/d1';
import { demoEnabled, forgetDemoSetting } from './demo';

// Outside development and without DEMO_SEED.
vi.mock('@/lib/env', () => ({ getConfig: () => ({ demoMode: false }) }));

describe('demo catalogue switch', () => {
  it('follows the admin setting, remembered for a moment', async () => {
    const db = createTestD1();
    await applyMigrations(db);
    expect(await demoEnabled(db)).toBe(false);
    await db.prepare(`INSERT INTO app_settings(key, value) VALUES ('demo_mode', '1')`).run();
    // Still the remembered value until the admin action forgets it.
    expect(await demoEnabled(db)).toBe(false);
    forgetDemoSetting(db);
    expect(await demoEnabled(db)).toBe(true);
  });
});
