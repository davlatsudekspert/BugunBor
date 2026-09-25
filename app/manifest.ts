import type { MetadataRoute } from 'next';

import { getI18n } from '@/lib/i18n/server';

// Web app manifest: makes the site installable and is the base for the
// Android (TWA) and iOS app shells.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t, locale } = await getI18n();
  return {
    id: '/',
    name: t.meta.title,
    short_name: t.app.shortName,
    description: t.meta.description,
    lang: locale,
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fffdf9',
    theme_color: '#fffdf9',
    categories: ['shopping', 'food', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: t.app.shortcutDeals, url: '/discover?source=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: t.app.shortcutCodes, url: '/account/codes?source=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: t.app.shortcutRedeem, url: '/business/redeem?source=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
