'use client';

import { useState } from 'react';
import { LoaderCircle, Star } from 'lucide-react';

export function ReviewForm({ redemptionId }: { redemptionId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  if (state === 'done') return <p className="text-sm font-bold text-emerald-700">Rahmat! Bahoyingiz saqlandi.</p>;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm font-bold text-primary">
        <Star className="size-4" /> Baholash
      </button>
    );
  }

  async function submit() {
    setState('loading');
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (window.location.hostname === 'localhost') headers['x-bugunbor-demo-user'] = 'usr_customer_browser';
    const response = await fetch('/api/v1/reviews', { method: 'POST', headers, body: JSON.stringify({ redemptionId, rating, comment: comment.trim() || undefined }) });
    if (!response.ok) { setState('error'); return; }
    setState('done');
  }

  return (
    <div className="mt-2 w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} yulduz`}>
            <Star className={`size-6 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={600} rows={2} placeholder="Fikringiz (ixtiyoriy)" className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none" />
      {state === 'error' ? <p className="mt-1 text-xs font-semibold text-red-600">Xatolik yuz berdi, qayta urinib ko‘ring.</p> : null}
      <button onClick={submit} disabled={state === 'loading'} className="mt-2 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-60">
        {state === 'loading' ? <LoaderCircle className="size-4 animate-spin" /> : null} Yuborish
      </button>
    </div>
  );
}
