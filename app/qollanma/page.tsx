import type { Metadata } from 'next';
import { Clock3, PlayCircle } from 'lucide-react';

import { AppBadges } from '@/components/site/app-badges';
import { getDb } from '@/db/client';
import { getConfig } from '@/lib/env';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { appStores, type AppStores } from '@/modules/app-stores';
import { APK_GUIDE, GUIDES, GUIDES_PAGE, PROMO, clock, guideCaptions, guidePoster, guideVideo, isoDuration } from '@/modules/guides';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.guides.metaTitle, description: t.guides.metaDescription, alternates: { canonical: GUIDES_PAGE } };
}

// A phone-shaped player: the videos are 9:16 and load only when played.
function Video({ slug, title }: { slug: string; title: string }) {
  return (
    <video controls playsInline preload="none" poster={guidePoster(slug)} aria-label={title} className="aspect-[9/16] w-full rounded-2xl bg-navy object-cover">
      <source src={guideVideo(slug)} type="video/mp4" />
      <track kind="captions" src={guideCaptions(slug)} srcLang="uz" label="O‘zbekcha" />
    </video>
  );
}

// The app's video guides. The download guide shows the APK from this site,
// so it is listed only while an admin serves the APK here.
export default async function GuidesPage() {
  const { t } = await getI18n();
  const g = t.guides;
  const stores: AppStores = await getDb().then(appStores).catch(() => ({ mode: 'off', android: null }));
  const series = GUIDES.map((guide, index) => ({ ...guide, part: index + 1 })).filter((guide) => guide.slug !== APK_GUIDE || stores.mode === 'apk');
  const origin = getConfig().appUrl ?? 'https://bugunbor.uz';
  const videos = {
    '@context': 'https://schema.org',
    '@graph': [{ ...PROMO, title: g.promoTitle, text: g.promoText }, ...series.map((guide) => ({ ...guide, ...g.items[guide.slug] }))].map((video) => ({
      '@type': 'VideoObject',
      name: video.title,
      description: video.text,
      thumbnailUrl: `${origin}${guidePoster(video.slug)}`,
      contentUrl: `${origin}${guideVideo(video.slug)}`,
      uploadDate: '2026-09-26',
      duration: isoDuration(video.seconds),
      inLanguage: 'uz',
    })),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videos) }} />
      <div className="flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-white"><PlayCircle className="size-7" aria-hidden /></span>
        <div>
          <h1 className="text-3xl font-black tracking-[-.05em] text-navy sm:text-5xl">{g.title}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">{g.lead}</p>
          {g.language ? <p className="mt-2 text-sm font-semibold text-slate-500">{g.language}</p> : null}
        </div>
      </div>

      <section className="mt-8 grid items-center gap-6 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-[280px_1fr] sm:p-8">
        <div className="mx-auto w-full max-w-[280px]"><Video slug={PROMO.slug} title={g.promoTitle} /></div>
        <div>
          <h2 className="text-2xl font-black tracking-[-.03em] text-navy sm:text-3xl">{g.promoTitle}</h2>
          <p className="mt-3 leading-7 text-slate-600">{g.promoText}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><Clock3 className="size-4" aria-hidden />{clock(PROMO.seconds)}</p>
        </div>
      </section>

      <h2 className="mt-12 text-2xl font-black tracking-[-.03em] text-navy">{g.seriesTitle}</h2>
      <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {series.map((guide) => {
          const item = g.items[guide.slug];
          return (
            <li key={guide.slug} id={guide.slug} className="flex scroll-mt-24 flex-col rounded-3xl border border-slate-200 bg-white p-4">
              <Video slug={guide.slug} title={item.title} />
              <div className="mt-4 flex items-center justify-between gap-3 text-sm font-bold">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{fmt(g.part, { n: guide.part, total: GUIDES.length })}</span>
                <span className="inline-flex items-center gap-1 text-slate-500"><Clock3 className="size-4" aria-hidden />{clock(guide.seconds)}</span>
              </div>
              <h3 className="mt-3 text-lg font-black text-navy">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
            </li>
          );
        })}
      </ol>

      <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{g.appTitle}</h2>
        <p className="mt-2 leading-7 text-slate-600">{g.appText}</p>
        <AppBadges stores={stores} t={t} className="mt-5" />
      </section>
    </main>
  );
}
