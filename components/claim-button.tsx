'use client';

import { useState } from 'react';
import { CheckCircle2, LoaderCircle, QrCode } from 'lucide-react';

type ClaimResponse = {
  data?: {
    code?: string;
    codeHint: string;
    expiresAt: string;
    replayed: boolean;
  };
  error?: { code: string; message: string };
};

export type ServiceSlotOption = {
  id: string;
  startsAt: string;
  remainingCapacity: number;
};

export function ClaimButton({
  dealId,
  branchId,
  slots,
}: {
  dealId: string;
  branchId: string;
  slots?: ServiceSlotOption[];
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');
  const openSlots = slots?.filter((slot) => slot.remainingCapacity > 0) ?? [];
  const [slotId, setSlotId] = useState(openSlots[0]?.id ?? '');
  const isService = slots !== undefined;

  async function claim() {
    if (isService && !slotId) {
      setState('error');
      setMessage('Vaqtni tanlang.');
      return;
    }
    setState('loading');
    setMessage('');
    const idempotencyKey = crypto.randomUUID();
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    };
    if (window.location.hostname === 'localhost')
      headers['x-bugunbor-demo-user'] = 'usr_customer_browser';
    const response = await fetch(`/api/v1/deals/${dealId}/redemptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(isService ? { branchId, slotId } : { branchId }),
    });
    const payload = (await response.json()) as ClaimResponse;
    if (!response.ok || !payload.data) {
      setState('error');
      setMessage(
        payload.error?.message ?? 'So‘rov bajarilmadi. Qayta urinib ko‘ring.',
      );
      return;
    }
    setState('success');
    setMessage(
      payload.data.code
        ? `Tasdiqlash kodi: ${payload.data.codeHint}`
        : `Band qilingan. Kod: ${payload.data.codeHint}`,
    );
  }

  if (isService && openSlots.length === 0 && state !== 'success') {
    return (
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
        Hozircha bo‘sh vaqt yo‘q.
      </p>
    );
  }

  return (
    <div aria-live="polite">
      {isService && state !== 'success' ? (
        <label className="mb-3 block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Vaqtni tanlang
          </span>
          <select
            value={slotId}
            onChange={(event) => setSlotId(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
          >
            {openSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {new Date(`${slot.startsAt}Z`).toLocaleTimeString('uz-UZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Tashkent',
                })}{' '}
                — {slot.remainingCapacity} joy
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        onClick={claim}
        disabled={state === 'loading' || state === 'success'}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(245,89,55,.24)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {state === 'loading' ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : state === 'success' ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <QrCode className="size-5" />
        )}
        {state === 'success'
          ? 'Band qilindi'
          : state === 'loading'
            ? 'Tekshirilmoqda…'
            : isService
              ? 'Vaqtni bron qilish'
              : 'Aksiyadan foydalanish'}
      </button>
      {message ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${state === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
