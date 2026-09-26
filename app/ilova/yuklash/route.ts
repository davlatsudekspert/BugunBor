import { getDb } from '@/db/client';
import { route } from '@/lib/http';
import { APK_FILES, APK_RELEASE_BASE, APP_PAGE, appStores } from '@/modules/app-stores';

// The download button: the newest APK from the public GitHub releases (64-bit,
// or `?v=32` for old phones). Only while an admin serves the APK from the site;
// otherwise back to the app page, which says what is available.
export const GET = route(async (request: Request) => {
  const url = new URL(request.url);
  const stores = await getDb().then(appStores).catch(() => null);
  const location = stores?.mode === 'apk' ? `${APK_RELEASE_BASE}/${url.searchParams.get('v') === '32' ? APK_FILES.armv7 : APK_FILES.arm64}` : new URL(APP_PAGE, url).toString();
  return new Response(null, { status: 302, headers: { location, 'cache-control': 'no-store' } });
});
