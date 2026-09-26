import type { Metadata } from 'next';
import { AlertTriangle, Clock3, Download, Play, PlayCircle, RefreshCw, Smartphone } from 'lucide-react';

import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { getI18n } from '@/lib/i18n/server';
import { APP_PAGE, appStores, type AppStores } from '@/modules/app-stores';
import { APK_GUIDE, GUIDES_PAGE } from '@/modules/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.appPage.metaTitle, description: t.appPage.metaDescription, alternates: { canonical: APP_PAGE } };
}

// The phone app: the APK from this site with the install steps, Google Play
// once the app is there, or "coming soon" — as an admin chose.
export default async function AppPage() {
  const { t } = await getI18n();
  const stores: AppStores = await getDb().then(appStores).catch(() => ({ mode: 'off', android: null }));
  const p = t.appPage;
  const origin = getConfig().appUrl ?? 'https://bugunbor.uz';
  const app = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'BugunBor',
    operatingSystem: 'Android 7.0+',
    applicationCategory: 'ShoppingApplication',
    url: `${origin}${APP_PAGE}`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'UZS' },
  };
  const button = 'inline-flex min-h-14 items-center gap-3 rounded-2xl bg-navy px-6 py-3 text-left font-black text-white transition hover:bg-navy-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(app) }} />
      <div className="flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-white"><Smartphone className="size-7" aria-hidden /></span>
        <div>
          <h1 className="text-4xl font-black tracking-[-.05em] text-navy sm:text-5xl">{p.title}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">{p.lead}</p>
        </div>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        {stores.mode === 'apk' ? (
          <>
            <a href={`${APP_PAGE}/yuklash`} className={button} data-download="android">
              <Download className="size-6 shrink-0" aria-hidden />
              <span className="text-lg">{p.download}</span>
            </a>
            <p className="mt-3 text-sm text-slate-600">{p.downloadNote}</p>
            <a href={`${APP_PAGE}/yuklash?v=32`} className="mt-2 inline-block text-sm font-bold text-primary hover:underline">{p.old}</a>
          </>
        ) : stores.mode === 'play' && stores.android ? (
          <a href={stores.android} target="_blank" rel="noopener" className={button}>
            <Play className="size-6 shrink-0 fill-current" aria-hidden />
            <span className="text-lg">{p.play}</span>
          </a>
        ) : (
          <p className="flex items-start gap-3 text-base font-semibold leading-7 text-navy">
            <Smartphone className="mt-1 size-5 shrink-0 text-primary" aria-hidden /> {p.soon}
          </p>
        )}
        <a href={stores.mode === 'apk' ? `${GUIDES_PAGE}#${APK_GUIDE}` : GUIDES_PAGE} className="mt-5 flex w-fit items-center gap-2 text-sm font-bold text-primary hover:underline">
          <PlayCircle className="size-5" aria-hidden /> {p.guides}
        </a>
        <p className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden />
          <span><strong className="text-navy">{p.iphoneTitle}.</strong> {p.iphoneText}</span>
        </p>
      </section>

      {stores.mode === 'apk' ? (
        <>
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{p.howTitle}</h2>
            <ol className="mt-6 space-y-5">
              {p.steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-base font-black text-white">{index + 1}</span>
                  <span><strong className="block text-lg text-navy">{step.title}</strong><span className="leading-7 text-slate-600">{step.text}</span></span>
                </li>
              ))}
            </ol>
          </section>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-xl font-black text-navy"><RefreshCw className="size-5 text-primary" aria-hidden /> {p.updateTitle}</h2>
              <p className="mt-3 leading-7 text-slate-600">{p.updateText}</p>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-xl font-black text-navy"><AlertTriangle className="size-5 text-amber-600" aria-hidden /> {p.helpTitle}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-600">
                {p.help.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
}
