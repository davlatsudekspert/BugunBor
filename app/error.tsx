'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';

// Error boundaries render on the client without access to the server
// dictionary, so the message is shown in both languages.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-16 text-center">
      <div>
        <TriangleAlert className="mx-auto size-12 text-amber-500" aria-hidden />
        <h1 className="mt-4 text-3xl font-black tracking-[-.04em] text-navy">Nimadir xato ketdi</h1>
        <p className="mt-2 text-slate-600">Что-то пошло не так. Попробуйте ещё раз.</p>
        <button type="button" onClick={reset} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-white">
          <RefreshCw className="size-4" aria-hidden /> Qayta urinish · Повторить
        </button>
      </div>
    </main>
  );
}
