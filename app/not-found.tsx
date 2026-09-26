import { SearchX } from 'lucide-react';

import { getI18n } from '@/lib/i18n/server';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-16 text-center">
      <div>
        <SearchX className="mx-auto size-12 text-slate-300" aria-hidden />
        <p className="mt-4 text-sm font-black uppercase tracking-[.14em] text-primary">404</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-navy">{t.notFound.title}</h1>
        <p className="mt-3 text-slate-600">{t.notFound.text}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/" className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-bold text-white">{t.notFound.home}</a>
          <a href="/discover" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 font-bold text-navy">{t.notFound.deals}</a>
        </div>
      </div>
    </main>
  );
}
