'use client';

import { useState } from 'react';
import { CheckCircle2, LoaderCircle, Phone, QrCode } from 'lucide-react';

type ClaimResponse = {
  data?: { code?: string; codeHint: string; expiresAt: string; replayed: boolean };
  error?: { code: string; message: string };
};

export function ClaimButton({ dealId, branchId, phone }: { dealId: string; branchId: string; phone?: string | null }) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');

  async function claim() {
    setState('loading');
    setMessage('');
    const idempotencyKey = crypto.randomUUID();
    const headers: Record<string, string> = { 'content-type': 'application/json', 'idempotency-key': idempotencyKey };
    if (window.location.hostname === 'localhost') headers['x-bugunbor-demo-user'] = 'usr_customer_browser';
    const response = await fetch(`/api/v1/deals/${dealId}/redemptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ branchId }),
    });
    const payload = (await response.json()) as ClaimResponse;
    if (!response.ok || !payload.data) {
      setState('error');
      setMessage(payload.error?.message ?? 'So‘rov bajarilmadi. Qayta urinib ko‘ring.');
      return;
    }
    setState('success');
    if (payload.data.code) {
      setCode(payload.data.code);
      setMessage('Ushbu kodni filialda ko‘rsating:');
    } else {
      setMessage(`Band qilingan. Kod oxiri: ${payload.data.codeHint}`);
    }
  }

  return (
    <div aria-live="polite">
      <button onClick={claim} disabled={state === 'loading' || state === 'success'} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(245,89,55,.24)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70">
        {state === 'loading' ? <LoaderCircle className="size-5 animate-spin" /> : state === 'success' ? <CheckCircle2 className="size-5" /> : <QrCode className="size-5" />}
        {state === 'success' ? 'Aksiya band qilindi' : state === 'loading' ? 'Tekshirilmoqda…' : 'Aksiyadan foydalanish'}
      </button>
      {message ? (
        <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${state === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
          <p>{message}</p>
          {code ? <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 text-center font-mono text-base font-black tracking-wide text-emerald-900">{code}</p> : null}
        </div>
      ) : null}
      {state === 'success' && phone ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
          <Phone className="mt-0.5 size-3.5 shrink-0" />
          Filial xodimi tizimni doim kuzatib turmasligi mumkin — borishdan oldin{' '}
          <a href={`tel:${phone}`} className="underline underline-offset-2">{phone}</a> raqamiga qo‘ng‘iroq qilib bronni tasdiqlashingiz tavsiya etiladi.
        </p>
      ) : null}
    </div>
  );
}
