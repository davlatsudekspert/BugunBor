'use client';

import { CheckCircle2, LoaderCircle, RefreshCw, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { QrCode } from '@/components/deals/qr-code';

type Labels = {
  button: string;
  matchCode: string;
  matchHint: string;
  openTelegram: string;
  qrHint: string;
  waiting: string;
  approved: string;
  expired: string;
  denied: string;
  restart: string;
  networkError: string;
};

type Started = { matchCode: string; deepLink: string; expiresAt: string };
type Phase = 'idle' | 'starting' | 'waiting' | 'approved' | 'expired' | 'denied' | 'error';

export function TelegramLogin({ returnTo, labels }: { returnTo: string; labels: Labels }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [started, setStarted] = useState<Started | null>(null);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function poll() {
    try {
      const response = await fetch('/api/v1/auth/telegram/status', { cache: 'no-store' });
      const payload = (await response.json()) as { data?: { status: string; returnTo?: string } };
      const status = payload.data?.status;
      if (status === 'APPROVED') {
        setPhase('approved');
        window.location.assign(payload.data?.returnTo ?? returnTo);
        return;
      }
      if (status === 'EXPIRED' || status === 'MISSING') {
        setPhase('expired');
        return;
      }
      if (status === 'DENIED') {
        setPhase('denied');
        return;
      }
    } catch {
      // Keep polling through brief network drops.
    }
    timer.current = setTimeout(poll, 2000);
  }

  async function start() {
    if (timer.current) clearTimeout(timer.current);
    setPhase('starting');
    setError('');
    try {
      const response = await fetch('/api/v1/auth/telegram/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ returnTo }),
      });
      const payload = (await response.json()) as { data?: Started; error?: { message: string } };
      if (!response.ok || !payload.data) {
        setPhase('error');
        setError(payload.error?.message ?? labels.networkError);
        return;
      }
      setStarted(payload.data);
      setPhase('waiting');
      timer.current = setTimeout(poll, 2500);
    } catch {
      setPhase('error');
      setError(labels.networkError);
    }
  }

  if (phase === 'idle' || phase === 'starting' || phase === 'error') {
    return (
      <div>
        <button type="button" onClick={start} disabled={phase === 'starting'} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-5 font-bold text-white shadow-[0_10px_25px_rgba(34,158,217,.28)] transition hover:bg-[#1b8cc2] disabled:opacity-70">
          {phase === 'starting' ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
          {labels.button}
        </button>
        {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
    );
  }

  if (phase === 'approved') {
    return <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-800"><CheckCircle2 className="size-5" aria-hidden /> {labels.approved}</p>;
  }

  if (phase === 'expired' || phase === 'denied') {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-center">
        <p className="font-bold text-navy">{phase === 'expired' ? labels.expired : labels.denied}</p>
        <button type="button" onClick={start} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white"><RefreshCw className="size-4" aria-hidden /> {labels.restart}</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">{labels.matchCode}</p>
        <p className="mt-1 font-mono text-5xl font-black tracking-[.2em] text-navy">{started?.matchCode}</p>
        <p className="mt-2 text-xs text-slate-500">{labels.matchHint}</p>
      </div>
      <a href={started?.deepLink} target="_blank" rel="noreferrer" className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-5 font-bold text-white shadow-[0_10px_25px_rgba(34,158,217,.28)] transition hover:bg-[#1b8cc2]">
        <Send className="size-5" aria-hidden /> {labels.openTelegram}
      </a>
      <div className="hidden items-center gap-4 rounded-2xl border border-dashed border-slate-300 p-4 md:flex">
        {started ? <QrCode value={started.deepLink} label={labels.openTelegram} className="size-28 shrink-0 rounded-lg bg-white p-1" /> : null}
        <p className="text-sm leading-6 text-slate-600">{labels.qrHint}</p>
      </div>
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500"><LoaderCircle className="size-4 animate-spin" aria-hidden /> {labels.waiting}</p>
    </div>
  );
}
