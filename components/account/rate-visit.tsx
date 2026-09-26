'use client';

import { CheckCircle2, LoaderCircle, Star } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { fmt } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

type Labels = { title: string; aria: string; placeholder: string; submit: string; thanks: string; networkError: string };

/** Five-star rating for a redeemed code, with an optional comment. */
export function RateVisit({ redemptionId, labels }: { redemptionId: string; labels: Labels }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');

  if (state === 'done') {
    return <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="size-4" aria-hidden /> {labels.thanks}</p>;
  }

  async function submit() {
    setState('saving');
    setError('');
    const result = await apiRequest('/api/v1/reviews', { redemptionId, rating, comment: comment.trim() || null }, { networkError: labels.networkError });
    if (!result.ok) {
      setState('idle');
      setError(result.message);
      return;
    }
    setState('done');
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <fieldset>
        <legend className="text-sm font-bold text-navy">{labels.title}</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className="group/star cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40">
              <input type="radio" name={`rating-${redemptionId}`} value={star} checked={rating === star} onChange={() => setRating(star)} aria-label={fmt(labels.aria, { count: star })} className="sr-only" />
              <Star className={cn('size-8 transition group-hover/star:scale-110', rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} aria-hidden />
            </label>
          ))}
        </div>
      </fieldset>
      {rating ? (
        <>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} maxLength={500} placeholder={labels.placeholder} aria-label={labels.placeholder} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <button type="button" onClick={() => void submit()} disabled={state === 'saving'} className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-60">
            {state === 'saving' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} {labels.submit}
          </button>
        </>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
