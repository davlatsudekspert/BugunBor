'use client';

import { Check, Clock3, Hand, LoaderCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type Labels = { waiting: string; delay: string; cancel: string; outOfStock: string; closed: string; sent: string; ask: string; networkError: string };

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

  const button = 'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-60';
  const messageButton = (kind: 'WAITING' | 'DELAY', label: string, Icon: typeof Hand) =>
    done.includes(kind) ? (
      <span className="inline-flex h-9 items-center gap-1.5 px-2 text-xs font-bold text-emerald-700"><Check className="size-3.5" aria-hidden /> {label} · {labels.sent}</span>
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
        {cancelling ? (
          (['OUT_OF_STOCK', 'CLOSED'] as const).map((reason) => (
            <button key={reason} type="button" disabled={busy !== null} onClick={() => void cancel(reason)} className={cn(button, 'border-red-200 text-red-700 hover:bg-red-50')}>
              {busy === reason ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null} {reason === 'OUT_OF_STOCK' ? labels.outOfStock : labels.closed}
            </button>
          ))
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => setCancelling(true)} className={cn(button, 'border-red-200 text-red-700 hover:bg-red-50')}>
            <XCircle className="size-3.5" aria-hidden /> {labels.cancel}
          </button>
        )}
      </div>
      {error ? <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
