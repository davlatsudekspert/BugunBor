import type { Metadata, Viewport } from 'next';

import { MobileTabBar } from '@/components/site/mobile-tab-bar';
import { ServiceWorker } from '@/components/site/service-worker';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { getConfig } from '@/lib/env';
import { htmlLang } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';

// Imported from JS (not from globals.css) so the build emits the font files.
import '@fontsource-variable/inter/wght.css';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return {
    metadataBase: new URL(getConfig().appUrl ?? 'https://bugunbor.uz'),
    title: { default: t.meta.title, template: '%s | BugunBor' },
    description: t.meta.description,
    applicationName: 'BugunBor',
    manifest: '/manifest.webmanifest',
    icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'BugunBor', statusBarStyle: 'default' },
    openGraph: {
      title: t.meta.ogTitle,
      description: t.meta.ogDescription,
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : 'uz_UZ',
      siteName: 'BugunBor',
      images: [{ url: '/og.png', width: 1728, height: 905, alt: t.meta.ogAlt }],
    },
    twitter: { card: 'summary_large_image', title: t.meta.ogTitle, description: t.meta.ogDescription, images: ['/og.png'] },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: '#fffdf9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t, locale } = await getI18n();
  return (
    <html lang={htmlLang(locale)}>
      <body className="min-h-dvh">
        {getConfig().demoMode ? (
          <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">{t.common.demoBanner}</p>
        ) : null}
        <SiteHeader />
        <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
          <SiteFooter />
        </div>
        <ServiceWorker />
        <MobileTabBar labels={{ mobile: t.nav.mobile, home: t.nav.home, search: t.nav.search, saved: t.nav.saved, codes: t.nav.codes, profile: t.nav.profile }} />
      </body>
    </html>
  );
}
