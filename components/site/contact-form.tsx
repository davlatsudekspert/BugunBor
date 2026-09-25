'use client';

import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

type Labels = { name: string; contact: string; subject: string; message: string; messagePlaceholder: string; send: string; sending: string; success: string; error: string };

const input = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-primary/25';

export function ContactForm({ labels, defaults }: { labels: Labels; defaults: { name?: string; contact?: string; subject?: string } }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (state === 'sent') {
    return <output className="mt-7 flex items-center gap-2 rounded-2xl bg-emerald-50 p-5 font-bold text-emerald-800"><CheckCircle2 className="size-5" aria-hidden /> {labels.success}</output>;
  }

  return (
    <form
      className="mt-7 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setState('sending');
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
          const response = await fetch('/api/v1/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
          const payload = (await response.json()) as { error?: { message: string } };
          if (!response.ok) {
            setState('error');
            setError(payload.error?.message ?? labels.error);
            return;
          }
          setState('sent');
        } catch {
          setState('error');
          setError(labels.error);
        }
      }}
    >
      <label className="block"><span className="mb-1.5 block text-sm font-bold text-navy">{labels.name}</span><input name="name" required minLength={2} maxLength={80} defaultValue={defaults.name} className={input} /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-bold text-navy">{labels.contact}</span><input name="contact" required minLength={5} maxLength={120} defaultValue={defaults.contact} className={input} /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-bold text-navy">{labels.subject}</span><input name="subject" required minLength={3} maxLength={160} defaultValue={defaults.subject} className={input} /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-bold text-navy">{labels.message}</span><textarea name="message" required minLength={10} maxLength={3000} rows={6} placeholder={labels.messagePlaceholder} className="w-full rounded-xl border border-slate-200 bg-white p-4 outline-none focus:ring-2 focus:ring-primary/25" /></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {state === 'error' ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <button disabled={state === 'sending'} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
        {state === 'sending' ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
        {state === 'sending' ? labels.sending : labels.send}
      </button>
    </form>
  );
}
