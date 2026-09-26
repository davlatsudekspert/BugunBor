import { describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { createTestD1 } from '@/test/d1';
import { GOOGLE_PLAY_URL, appStores, forgetAppStores } from './app-stores';

describe('app store links', () => {
  it('opens Google Play only once an admin says the app is there', async () => {
    const db = createTestD1();
    await applyMigrations(db);
    expect(await appStores(db)).toEqual({ android: null });
    await db.prepare(`INSERT INTO app_settings(key, value) VALUES ('android_store_live', '1')`).run();
    // Still the remembered value until the admin action forgets it.
    expect(await appStores(db)).toEqual({ android: null });
    forgetAppStores(db);
    expect(await appStores(db)).toEqual({ android: GOOGLE_PLAY_URL });
    expect(GOOGLE_PLAY_URL).toBe('https://play.google.com/store/apps/details?id=uz.bugunbor.app');

    await db.prepare(`UPDATE app_settings SET value = '0' WHERE key = 'android_store_live'`).run();
    forgetAppStores(db);
    expect(await appStores(db)).toEqual({ android: null });
  });

  it('says "coming soon" when the settings cannot be read', async () => {
    // A database without tables (e.g. before migrations) never breaks a page.
    expect(await appStores(createTestD1())).toEqual({ android: null });
  });
});
