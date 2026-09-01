'use client';

import { useState } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';

export function ContactForm({ defaultSubject }: { defaultSubject?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(formData: FormData) {
    setState('loading');
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch('/api/v1/support/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: { message: string } };
      if (!response.ok) { setState('error'); setMessage(result.error?.message ?? 'Xabar yuborilmadi.'); return; }
      setState('success');
    } catch {
      setState('error');
      setMessage('Tarmoq xatosi. Qayta urinib ko‘ring.');
    }
  }

  if (state === 'success') {
    return (
      <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h2 className="mt-3 text-xl font-black text-emerald-950">Xabar yuborildi</h2>
        <p className="mt-2 text-emerald-800">Jamoamiz ko‘rsatgan telefon raqamingiz orqali tez orada bog‘lanadi.</p>
      </div>
    );
  }

  return (
    <form action={submit} className="mt-7 space-y-4">
      <input name="name" required minLength={2} maxLength={120} placeholder="Ismingiz" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
      <input name="phone" required pattern="\+998\d{9}" defaultValue="+998" placeholder="+998901234567" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
      <input name="subject" defaultValue={defaultSubject} required minLength={3} placeholder="Mavzu" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
      <textarea name="message" required minLength={5} rows={6} placeholder="Xabaringiz…" className="w-full rounded-xl border border-slate-200 p-4" />
      {state === 'error' ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <button disabled={state === 'loading'} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
        {state === 'loading' ? <LoaderCircle className="size-5 animate-spin" /> : null} {state === 'loading' ? 'Yuborilmoqda…' : 'Xabar yuborish'}
      </button>
    </form>
  );
}
