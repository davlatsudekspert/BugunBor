'use client';

import { BellPlus, BellRing, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import { fmt } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

type Props = {
  businessId: string;
  initial: { following: boolean; followers: number };
  loggedIn: boolean;
  labels: { follow: string; following: string; followers: string; hint: string };
  compact?: boolean;
};

/** Follow a business to get its new deals in Telegram. */
export function FollowButton({ businessId, initial, loggedIn, labels, compact = false }: Props) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/follows/${encodeURIComponent(businessId)}`, { method: state.following ? 'DELETE' : 'PUT' });
      const payload = (await response.json().catch(() => ({}))) as { data?: { following: boolean; followers: number } };
      if (response.ok && payload.data) setState(payload.data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', compact && 'gap-x-2')}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={state.following}
        title={labels.hint}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:opacity-70',
          state.following ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'bg-navy text-white hover:bg-navy/90',
        )}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : state.following ? <BellRing className="size-4" aria-hidden /> : <BellPlus className="size-4" aria-hidden />}
        {state.following ? labels.following : labels.follow}
      </button>
      {state.followers > 0 ? <span className="text-xs font-semibold text-slate-500">{fmt(labels.followers, { count: state.followers })}</span> : null}
      {!compact && !state.following ? <span className="basis-full text-xs text-slate-500">{labels.hint}</span> : null}
    </div>
  );
}
