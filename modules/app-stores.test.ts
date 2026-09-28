import { describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { createTestD1 } from '@/test/d1';
import { APK_FILES, APK_RELEASE_BASE, GOOGLE_PLAY_URL, appStores, forgetAppStores, forgetLatestApk, latestApkBuild, latestApkSize } from './app-stores';

describe('app store links', () => {
  it('follows the admin’s choice: coming soon, the APK page, or Google Play', async () => {
    const db = createTestD1();
    await applyMigrations(db);
    expect(await appStores(db)).toEqual({ mode: 'off', android: null });
    await db.prepare(`INSERT INTO app_settings(key, value) VALUES ('android_download', 'apk')`).run();
    // Still the remembered value until the admin action forgets it.
    expect(await appStores(db)).toEqual({ mode: 'off', android: null });
    forgetAppStores(db);
    expect(await appStores(db)).toEqual({ mode: 'apk', android: '/ilova' });

    await db.prepare(`UPDATE app_settings SET value = 'play' WHERE key = 'android_download'`).run();
    forgetAppStores(db);
    expect(await appStores(db)).toEqual({ mode: 'play', android: GOOGLE_PLAY_URL });
    expect(GOOGLE_PLAY_URL).toBe('https://play.google.com/store/apps/details?id=uz.bugunbor.app');

    // Anything unknown reads as "coming soon".
    await db.prepare(`UPDATE app_settings SET value = 'yes' WHERE key = 'android_download'`).run();
    forgetAppStores(db);
    expect(await appStores(db)).toEqual({ mode: 'off', android: null });
  });

  it('says "coming soon" when the settings cannot be read', async () => {
    // A database without tables (e.g. before migrations) never breaks a page.
    expect(await appStores(createTestD1())).toEqual({ mode: 'off', android: null });
  });

  it('names the files the release workflow publishes', () => {
    expect(`${APK_RELEASE_BASE}/${APK_FILES.arm64}`).toBe('https://github.com/davlatsudekspert/BugunBor/releases/latest/download/BugunBor-arm64.apk');
    expect(APK_FILES.armv7).toBe('BugunBor-armv7.apk');
  });

  it('reads the newest build from the latest release, remembers it, and keeps it when GitHub is away', async () => {
    forgetLatestApk();
    const calls: string[] = [];
    const answer = (location: string | null, status = 302) => (async (url: string | URL | Request) => {
      calls.push(url instanceof Request ? url.url : url.toString());
      return new Response(null, { status, headers: location ? { location } : {} });
    }) as typeof fetch;
    const at = 1_000_000;
    expect(await latestApkBuild(answer('https://github.com/davlatsudekspert/BugunBor/releases/tag/app-v1.0.0-45'), at)).toBe(45);
    expect(calls).toEqual(['https://github.com/davlatsudekspert/BugunBor/releases/latest']);
    // Ten minutes later it asks again; a failure keeps 45.
    expect(await latestApkBuild(answer('https://github.com/x/y/releases/tag/app-v1.0.1-46'), at + 60_000)).toBe(45);
    const down = (async () => { throw new Error('offline'); }) as typeof fetch;
    expect(await latestApkBuild(down, at + 11 * 60_000)).toBe(45);
    expect(await latestApkBuild(answer('https://github.com/davlatsudekspert/BugunBor/releases/tag/app-v1.0.1-46'), at + 22 * 60_000)).toBe(46);
    // No release at all.
    forgetLatestApk();
    expect(await latestApkBuild(answer(null, 404), at)).toBeNull();
    forgetLatestApk();
  });

  it('reads the newest APK’s size from one byte of it, remembers it, and keeps it when GitHub is away', async () => {
    forgetLatestApk();
    const calls: Array<{ url: string; range: string | null }> = [];
    const file = (total: number | null, status = 206) => (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: url instanceof Request ? url.url : url.toString(), range: new Headers(init?.headers).get('range') });
      return new Response(status === 206 ? 'x' : null, { status, headers: total ? { 'content-range': `bytes 0-0/${total}` } : {} });
    }) as typeof fetch;
    const at = 1_000_000;
    expect(await latestApkSize(file(30_012_345), at)).toBe(30_012_345);
    expect(calls).toEqual([{ url: 'https://github.com/davlatsudekspert/BugunBor/releases/latest/download/BugunBor-arm64.apk', range: 'bytes=0-0' }]);
    expect(await latestApkSize(file(26_400_000), at + 60_000)).toBe(30_012_345);
    const down = (async () => { throw new Error('offline'); }) as typeof fetch;
    expect(await latestApkSize(down, at + 11 * 60_000)).toBe(30_012_345);
    // A reply without the length keeps what was known; no release at all is no size.
    expect(await latestApkSize(file(null, 200), at + 22 * 60_000)).toBe(30_012_345);
    expect(await latestApkSize(file(null, 404), at + 33 * 60_000)).toBeNull();
    forgetLatestApk();
  });
});

