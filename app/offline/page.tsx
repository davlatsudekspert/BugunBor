import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';

import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.offline.title, robots: { index: false, follow: false } };
}

// Cached by the service worker and shown when a page cannot load offline.
export default async function OfflinePage() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 py-16 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-navy text-white"><WifiOff className="size-8" aria-hidden /></span>
        <h1 className="mt-5 text-3xl font-black tracking-[-.04em] text-navy">{t.offline.title}</h1>
        <p className="mt-3 text-slate-600">{t.offline.text}</p>
        <p className="mt-2 text-sm text-slate-500">{t.offline.codesHint}</p>
        <a href="/" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 font-bold text-white">{t.offline.retry}</a>
      </div>
    </main>
  );
}
