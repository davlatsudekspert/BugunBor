'use client';

import { CheckCircle2, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type Labels = { button: string; title: string; comment: string; send: string; cancel: string; thanks: string; login: string; networkError: string };

/**
 * A complaint to the moderators: about a deal or a business ("Shikoyat
 * qilish"), or about a booked code ("Aksiya berilmadimi?"). A reason, an
 * optional comment; guests are sent to sign in first.
 */
export function ComplaintButton({ targetType, targetId, reasons, loggedIn, loginHref, labels, className }: {
  targetType: 'DEAL' | 'BUSINESS' | 'REDEMPTION';
  targetId: string;
  reasons: Array<{ value: string; label: string }>;
  loggedIn: boolean;
  loginHref: string;
  labels: Labels;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const name = useId();
  const panel = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstRadio = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);

  // Opening moves to the first reason; closing returns to the button.
  useEffect(() => {
    if (open) firstRadio.current?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const trigger = 'inline-flex min-h-11 items-center gap-2 py-2 text-sm text-slate-500 underline-offset-4 hover:underline';
  if (state === 'done') {
    // <output> is announced by screen readers when it appears.
    return <output className={cn('flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800', className)}><CheckCircle2 className="size-4" aria-hidden /> {labels.thanks}</output>;
  }
  if (!loggedIn) {
    return <a href={loginHref} className={cn(trigger, className)} title={labels.login}><TriangleAlert className="size-4" aria-hidden /> {labels.button}</a>;
  }
  const button = (
    <button ref={triggerRef} type="button" onClick={() => setOpen((value) => !value)} className={cn(trigger, open ? null : className)} aria-expanded={open} aria-controls={panel}>
      <TriangleAlert className="size-4" aria-hidden /> {labels.button}
    </button>
  );
  if (!open) return button;

  async function send() {
    setState('sending');
    setError('');
    const result = await apiRequest('/api/v1/reports', { targetType, targetId, reason, comment: comment.trim() || undefined }, { networkError: labels.networkError });
    if (!result.ok) {
      setState('idle');
      setError(result.message);
      return;
    }
    setState('done');
  }

  return (
    <div className={className}>
      {button}
      <div id={panel} className="mt-2 rounded-xl border border-slate-200 bg-white p-4">
        <fieldset>
          <legend className="text-sm font-bold text-navy">{labels.title}</legend>
          <div className="mt-2 space-y-1">
            {reasons.map((item, index) => (
              <label key={item.value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm text-slate-700 hover:bg-slate-50">
                <input ref={index === 0 ? firstRadio : undefined} type="radio" name={name} value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} className="size-4 shrink-0 accent-[var(--primary)]" />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} maxLength={500} placeholder={labels.comment} aria-label={labels.comment} className="mt-2 w-full rounded-lg border border-slate-200 p-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => void send()} disabled={!reason || state === 'sending'} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-50">
            {state === 'sending' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} {labels.send}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">{labels.cancel}</button>
        </div>
        {error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
