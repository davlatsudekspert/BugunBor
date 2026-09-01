'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LoaderCircle, MinusCircle } from 'lucide-react';

type ActiveDeal = { id: string; title: string; remainingQuantity: number | null };

export function OfflineSaleAdjuster({ deals }: { deals: ActiveDeal[] }) {
  const router = useRouter();
  const [dealId, setDealId] = useState(deals[0]?.id ?? '');
  const [quantitySold, setQuantitySold] = useState(1);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!deals.length) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">Hozircha miqdor cheklangan faol aksiya yo‘q.</p>;
  }

  async function submit() {
    setState('loading');
    setMessage('');
    const response = await fetch(`/api/v1/business/deals/${dealId}/adjust-stock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantitySold }),
    });
    const result = (await response.json()) as { data?: { remainingQuantity: number }; error?: { message: string } };
    if (!response.ok) { setState('error'); setMessage(result.error?.message ?? 'Belgilanmadi.'); return; }
    setState('success');
    setMessage(`Yangilandi: ${result.data!.remainingQuantity} ta qoldi.`);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <select value={dealId} onChange={(event) => { setDealId(event.target.value); setState('idle'); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title} ({deal.remainingQuantity} ta qoldi)</option>)}
        </select>
        <input type="number" min={1} value={quantitySold} onChange={(event) => setQuantitySold(Math.max(1, Number(event.target.value)))} className="h-11 w-20 rounded-xl border border-slate-200 px-3 text-center text-sm" />
        <button onClick={submit} disabled={state === 'loading'} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#152a3b] px-4 text-sm font-bold text-white disabled:opacity-60">
          {state === 'loading' ? <LoaderCircle className="size-4 animate-spin" /> : <MinusCircle className="size-4" />} Kamaytirish
        </button>
      </div>
      {message ? (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${state === 'error' ? 'bg-red-50 text-red-700' : 'flex items-center gap-2 bg-emerald-50 text-emerald-800'}`}>
          {state === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : null}
          {message}
        </p>
      ) : null}
    </div>
  );
}
