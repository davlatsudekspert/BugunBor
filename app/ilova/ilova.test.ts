import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { forgetAppStores, forgetLatestApk } from '@/modules/app-stores';
import { createTestD1 } from '@/test/d1';

const state = vi.hoisted(() => ({ db: null as unknown as D1Database }));
vi.mock('@/db/client', () => ({ getDb: async () => state.db }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock('@/lib/env', () => ({ getConfig: () => ({ appUrl: 'https://bugunbor.uz' }) }));

const { GET: download } = await import('./yuklash/route');
const { default: AppPage } = await import('./page');

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

  it('says the size of the file the button gives today, and no size when GitHub does not answer', async () => {
    await choose('apk');
    forgetLatestApk();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 206, headers: { 'content-range': 'bytes 0-0/39586915' } })));
    expect(renderToStaticMarkup(await AppPage())).toContain('APK fayl · 39,6 MB · Android 7.0 va yangiroq');
    forgetLatestApk();
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline');
    }));
    const page = renderToStaticMarkup(await AppPage());
    expect(page).toContain('APK fayl · Android 7.0 va yangiroq');
    expect(page).not.toMatch(/APK fayl · [\d,]+ MB/);
    vi.unstubAllGlobals();
    forgetLatestApk();
  });
});
