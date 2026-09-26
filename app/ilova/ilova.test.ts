import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { forgetAppStores } from '@/modules/app-stores';
import { createTestD1 } from '@/test/d1';

const state = vi.hoisted(() => ({ db: null as unknown as D1Database }));
vi.mock('@/db/client', () => ({ getDb: async () => state.db }));

const { GET: download } = await import('./yuklash/route');

async function choose(mode: string) {
  await state.db.prepare(`INSERT INTO app_settings(key, value) VALUES ('android_download', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(mode).run();
  forgetAppStores(state.db);
}

describe('the APK download link', () => {
  beforeEach(async () => {
    state.db = createTestD1();
    await applyMigrations(state.db);
  });

  it('gives the newest release only while an admin serves the APK from the site', async () => {
    const off = await download(new Request('https://bugunbor.uz/ilova/yuklash'));
    expect([off.status, off.headers.get('location')]).toEqual([302, 'https://bugunbor.uz/ilova']);

    await choose('apk');
    const phone = await download(new Request('https://bugunbor.uz/ilova/yuklash'));
    expect([phone.status, phone.headers.get('location'), phone.headers.get('cache-control')]).toEqual([
      302,
      'https://github.com/davlatsudekspert/BugunBor/releases/latest/download/BugunBor-arm64.apk',
      'no-store',
    ]);
    const old = await download(new Request('https://bugunbor.uz/ilova/yuklash?v=32'));
    expect(old.headers.get('location')).toBe('https://github.com/davlatsudekspert/BugunBor/releases/latest/download/BugunBor-armv7.apk');

    // Google Play chosen: the site's file is not offered any more.
    await choose('play');
    const play = await download(new Request('https://bugunbor.uz/ilova/yuklash'));
    expect(play.headers.get('location')).toBe('https://bugunbor.uz/ilova');
  });
});
