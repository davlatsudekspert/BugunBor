import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://bugunbor.uz'),
  title: {
    default: 'BugunBor — yaqin aksiyalar va maxsus takliflar',
    template: '%s | BugunBor',
  },
  description:
    'O‘zbekistondagi yaqin, vaqt bilan cheklangan aksiyalarni toping va ulardan vaqt tugashidan oldin foydalaning.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Bugun bor — ertaga bo‘lmasligi mumkin',
    description: 'Yaqiningizdagi eng yaxshi takliflarni hozir toping.',
    type: 'website',
    locale: 'uz_UZ',
    siteName: 'BugunBor',
    images: [{ url: '/og.png', width: 1728, height: 905, alt: 'BugunBor — yaqin aksiyalar' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bugun bor — ertaga bo‘lmasligi mumkin',
    description: 'Yaqiningizdagi eng yaxshi takliflarni hozir toping.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz-Latn">
      <body>{children}</body>
    </html>
  );
}
