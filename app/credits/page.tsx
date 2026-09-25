import type { Metadata } from 'next';

import { getI18n } from '@/lib/i18n/server';
import { STOCK_PHOTOS } from '@/lib/stock-photos';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.credits.title };
}

// Attribution for the freely licensed photos used on demo deals.
export default async function CreditsPage() {
  const { t } = await getI18n();
  const photos = Object.entries(STOCK_PHOTOS);
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{t.credits.title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t.credits.text}</p>
      {photos.length ? (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {photos.map(([key, photo]) => (
            <li key={key} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <img src={photo.src} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 text-sm">
                <p className="truncate font-bold text-navy">{photo.title}</p>
                <p className="truncate text-slate-600">{t.credits.author}: {photo.author}</p>
                <p className="text-slate-600">
                  {t.credits.license}: <a href={photo.licenseUrl} target="_blank" rel="noreferrer license" className="font-semibold text-primary underline-offset-2 hover:underline">{photo.license}</a>
                  {' · '}
                  <a href={photo.source} target="_blank" rel="noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">{t.credits.source}</a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">{t.credits.empty}</p>
      )}
    </main>
  );
}
