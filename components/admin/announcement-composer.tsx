'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LoaderCircle, Send } from 'lucide-react';

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

type ActiveDeal = { id: string; title: string; slug: string; discountPercent: number; businessName: string };

function templateFor(deal: ActiveDeal) {
  return `🔥 -${deal.discountPercent}% — ${deal.title}\n${deal.businessName}\nBatafsil: https://bugunbor.uz/deals/${deal.slug}`;
}

export function AnnouncementComposer({ deals }: { deals: ActiveDeal[] }) {
  const router = useRouter();
  const [dealId, setDealId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function pickDeal(id: string) {
    setDealId(id);
    const deal = deals.find((entry) => entry.id === id);
    if (deal) setMessage(templateFor(deal));
  }

  async function send() {
    setBusy(true);
    setError('');
    setSuccess(false);
    let response: Response;
    let result: { error?: { message: string } };
    try {
      response = await fetch('/api/v1/admin/announcements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, dealId: dealId || undefined }),
      });
      result = (await response.json()) as { error?: { message: string } };
    } catch {
      setBusy(false);
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
      return;
    }
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'Yuborilmadi.'); return; }
    setSuccess(true);
    setMessage('');
    setDealId('');
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Aksiyadan shablon yaratish (ixtiyoriy)</span>
        <NativeSelect value={dealId} onChange={(event) => pickDeal(event.target.value)} className="w-full" selectClassName="h-11 text-sm">
          <NativeSelectOption value="">— Erkin xabar —</NativeSelectOption>
          {deals.map((deal) => <NativeSelectOption key={deal.id} value={deal.id}>{deal.businessName} — {deal.title}</NativeSelectOption>)}
        </NativeSelect>
      </label>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Xabar matni</span>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} minLength={5} maxLength={1000} placeholder="Kanalga yuboriladigan matn…" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
      </label>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="size-4" /> Kanalga yuborildi.</p> : null}

      <button onClick={send} disabled={busy || message.trim().length < 5} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Kanalga yuborish
      </button>
    </div>
  );
}
