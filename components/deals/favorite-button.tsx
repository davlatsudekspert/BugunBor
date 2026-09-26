'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  dealId: string;
  initial: boolean;
  loggedIn: boolean;
  labels: { save: string; unsave: string };
  className?: string;
  withText?: { save: string; saved: string };
};

export function FavoriteButton({ dealId, initial, loggedIn, labels, className, withText }: Props) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/favorites/${encodeURIComponent(dealId)}`, { method: next ? 'PUT' : 'DELETE' });
      if (!response.ok) setSaved(!next);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? labels.unsave : labels.save}
      className={cn(
        withText
          ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-navy transition hover:border-primary/40'
          : 'grid size-10 place-items-center rounded-full bg-white/95 text-slate-600 shadow-sm transition hover:text-primary',
        className,
      )}
    >
      <Heart className={cn('size-5 transition', saved && 'fill-primary text-primary')} aria-hidden />
      {withText ? (saved ? withText.saved : withText.save) : null}
    </button>
  );
}
