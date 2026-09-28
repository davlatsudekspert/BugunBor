'use client';

import { Check, Clock3, Hand, LoaderCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type Labels = { waiting: string; delay: string; cancel: string; outOfStock: string; closed: string; sent: string; ask: string; reason: string; back: string; networkError: string };

/**
 * An active booking in the business's list: a ready message to the person
 * (each once), or a cancellation with its reason. Their number stays hidden;
 * BugunBor delivers the message.
 */
export function BookingActions({ businessId, redemptionId, sent, labels }: { businessId: string; redemptionId: string; sent: string[]; labels: Labels }) {
  const router = useRouter();
  const [done, setDone] = useState<string[]>(sent);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const firstReason = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);

  // Keyboard and screen-reader users land on the reasons, and back on «Bekor qilish» after.
  useEffect(() => {
    if (cancelling) firstReason.current?.focus();
    else if (opened.current) cancelButton.current?.focus();
    opened.current = cancelling;
  }, [cancelling]);

  async function send(body: Record<string, string>, key: string) {
    setBusy(key);
    setError('');
    const result = await apiRequest(`/api/v1/business/${businessId}`, { ...body, redemptionId }, { networkError: labels.networkError });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    return true;
  }

  async function message(kind: 'WAITING' | 'DELAY') {
    if (await send({ type: 'booking.message', message: kind }, kind)) setDone((list) => [...list, kind]);
  }

  async function cancel(reason: 'OUT_OF_STOCK' | 'CLOSED') {
    if (!window.confirm(labels.ask)) return;
    if (await send({ type: 'booking.cancel', reason }, reason)) router.refresh();
  }

  const button = 'inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-60';
  const messageButton = (kind: 'WAITING' | 'DELAY', label: string, Icon: typeof Hand) =>
    done.includes(kind) ? (
      <span className="inline-flex h-11 items-center gap-1.5 px-2 text-xs font-bold text-emerald-700"><Check className="size-3.5" aria-hidden /> {label} · {labels.sent}</span>
    ) : (
      <button type="button" disabled={busy !== null} onClick={() => void message(kind)} className={cn(button, 'border-slate-200 text-navy hover:border-primary/40')}>
        {busy === kind ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Icon className="size-3.5" aria-hidden />} {label}
      </button>
    );

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {messageButton('WAITING', labels.waiting, Hand)}
        {messageButton('DELAY', labels.delay, Clock3)}
        {cancelling ? null : (
          <button ref={cancelButton} type="button" disabled={busy !== null} onClick={() => setCancelling(true)} className={cn(button, 'border-red-200 text-red-700 hover:bg-red-50')}>
            <XCircle className="size-3.5" aria-hidden /> {labels.cancel}
          </button>
        )}
      </div>
      {cancelling ? (
        <fieldset className="mt-2 min-w-0 rounded-xl bg-red-50/60 p-2">
          <legend className="float-left mb-1.5 w-full px-1 text-xs font-bold text-red-800">{labels.reason}</legend>
          <div className="clear-left flex flex-wrap gap-2">
            {(['OUT_OF_STOCK', 'CLOSED'] as const).map((reason, index) => (
              <button key={reason} ref={index === 0 ? firstReason : undefined} type="button" disabled={busy !== null} onClick={() => void cancel(reason)} className={cn(button, 'border-red-200 bg-white text-red-700 hover:bg-red-50')}>
                {busy === reason ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null} {reason === 'OUT_OF_STOCK' ? labels.outOfStock : labels.closed}
              </button>
            ))}
            <button type="button" disabled={busy !== null} onClick={() => setCancelling(false)} className={cn(button, 'border-transparent text-slate-600 hover:bg-white')}>{labels.back}</button>
          </div>
        </fieldset>
      ) : null}
      {error ? <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
