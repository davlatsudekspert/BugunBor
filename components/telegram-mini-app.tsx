'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Send, TriangleAlert } from 'lucide-react';

// Minimal shape of the Telegram Web App JS SDK this component actually uses.
// See https://core.telegram.org/bots/webapps#initializing-mini-apps
type TelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
  themeParams?: { bg_color?: string };
};
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SDK_SRC = 'https://telegram.org/js/telegram-web-app.js';

export function TelegramMiniApp({ returnTo = '/discover' }: { returnTo?: string }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'not-telegram' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Load the SDK once; a repeat mount (fast refresh, back-navigation) reuses the same script.
      if (!document.querySelector(`script[src="${SDK_SRC}"]`)) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = SDK_SRC;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('sdk_load_failed'));
          document.head.appendChild(script);
        }).catch(() => {});
      }
      if (cancelled) return;

      const webApp = window.Telegram?.WebApp;
      if (!webApp?.initData) {
        // Not actually running inside Telegram (e.g. opened directly in a browser) — initData
        // is only ever populated by the real Telegram client, never by loading this URL plainly.
        setState('not-telegram');
        return;
      }

      webApp.ready();
      webApp.expand();

      const response = await fetch('/api/v1/telegram/webapp/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ initData: webApp.initData }),
      }).catch(() => null);

      if (cancelled) return;
      if (!response?.ok) { setState('error'); return; }
      router.replace(returnTo);
    }

    void boot();
    return () => { cancelled = true; };
  }, [returnTo, router]);

  if (state === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f1e8] text-[#152a3b]">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 font-semibold">Ulanmoqda…</p>
        </div>
      </div>
    );
  }

  if (state === 'not-telegram') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f1e8] p-4 text-[#152a3b]">
        <div className="max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_20px_70px_rgba(20,40,55,.12)]">
          <Send className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-xl font-black">Telegram orqali oching</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Bu sahifa Telegram Mini App sifatida ishlaydi — botimizni Telegram ilovasida oching.</p>
          <a href="https://t.me/bugunborbot" target="_blank" rel="noreferrer" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white">
            <Send className="size-4" /> @bugunborbot ni ochish
          </a>
          <a href="/discover" className="mt-3 block text-sm font-semibold text-slate-500 underline underline-offset-2">Yoki brauzerda davom etish</a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f1e8] p-4 text-[#152a3b]">
      <div className="max-w-sm rounded-3xl border border-red-200 bg-white p-7 text-center shadow-[0_20px_70px_rgba(20,40,55,.12)]">
        <TriangleAlert className="mx-auto size-10 text-red-500" />
        <h1 className="mt-4 text-xl font-black">Ulanmadi</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Telegram orqali tasdiqlash muvaffaqiyatsiz bo‘ldi. Botni qayta oching yoki brauzerda davom eting.</p>
        <a href="/discover" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 font-bold text-white">Brauzerda davom etish</a>
      </div>
    </div>
  );
}
