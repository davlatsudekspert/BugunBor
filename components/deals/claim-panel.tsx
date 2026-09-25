'use client';

import { CheckCircle2, LoaderCircle, LogIn, QrCode as QrIcon, TicketCheck } from 'lucide-react';
import { useState } from 'react';

import { fmt } from '@/lib/i18n/config';
import { formatClock, parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { formatRedemptionCode } from '@/modules/redemptions/codes';
import { QrCode } from './qr-code';

type Branch = { id: string; name: string; address: string };

type Labels = {
  button: string;
  loginToClaim: string;
  claiming: string;
  hint: string;
  successTitle: string;
  yourCode: string;
  validUntil: string;
  showToCashier: string;
  goToCodes: string;
  alreadyHave: string;
  limitReached: string;
  viewCode: string;
  chooseBranch: string;
  unavailable: string;
  networkError: string;
  qrAria: string;
};

type Props = {
  dealId: string;
  branches: Branch[];
  loggedIn: boolean;
  loginHref: string;
  claimable: boolean;
  hasActiveCode: boolean;
  /** The customer already used this deal as many times as allowed. */
  limitReached: boolean;
  labels: Labels;
};

type Success = { code: string; expiresAt: string };

export function ClaimPanel({ dealId, branches, loggedIn, loginHref, claimable, hasActiveCode, limitReached, labels }: Props) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  if (hasActiveCode && !success) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
        <p className="flex items-center gap-2 text-sm font-bold"><TicketCheck className="size-5" aria-hidden /> {labels.alreadyHave}</p>
        <a href="/account/codes" className="mt-3 flex h-12 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">{labels.viewCode}</a>
      </div>
    );
  }

  if (limitReached && !success) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
        <p className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" aria-hidden /> {labels.limitReached}</p>
        <a href="/account/codes" className="mt-3 inline-flex font-bold text-primary">{labels.goToCodes}</a>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <a href={loginHref} className={cn('flex h-13 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-white shadow-[0_10px_25px_rgba(245,89,55,.24)] transition hover:bg-primary/90', !claimable && 'pointer-events-none opacity-60')} aria-disabled={!claimable}>
        <LogIn className="size-5" aria-hidden /> {claimable ? labels.loginToClaim : labels.unavailable}
      </a>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center" aria-live="polite">
        <CheckCircle2 className="mx-auto size-8 text-emerald-600" aria-hidden />
        <p className="mt-2 font-black text-emerald-950">{labels.successTitle}</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-emerald-800">{labels.yourCode}</p>
        <p className="mt-1 font-mono text-4xl font-black tracking-[.12em] text-navy">{formatRedemptionCode(success.code)}</p>
        <QrCode value={`${window.location.origin}/r/${success.code}`} label={fmt(labels.qrAria, { code: success.code })} className="mx-auto mt-4 size-40 rounded-xl bg-white p-2" />
        <p className="mt-3 text-sm font-semibold text-emerald-900">{fmt(labels.validUntil, { time: formatClock(parseDbTime(success.expiresAt)) })}</p>
        <p className="mt-1 text-xs text-emerald-800">{labels.showToCashier}</p>
        <a href="/account/codes" className="mt-4 flex h-11 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">{labels.goToCodes}</a>
      </div>
    );
  }

  async function claim() {
    setState('loading');
    setError(null);
    try {
      const response = await fetch(`/api/v1/deals/${encodeURIComponent(dealId)}/redemptions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
        body: JSON.stringify({ branchId }),
      });
      const payload = (await response.json()) as { data?: Success; error?: { code: string; message: string } };
      if (!response.ok || !payload.data) {
        setState('error');
        setError(payload.error ?? { code: 'SERVER', message: labels.networkError });
        // A definite rejection gets a fresh key; a retry after a network error reuses it.
        setIdempotencyKey(crypto.randomUUID());
        return;
      }
      setSuccess(payload.data);
      setState('idle');
    } catch {
      setState('error');
      setError({ code: 'NETWORK', message: labels.networkError });
    }
  }

  return (
    <div className="space-y-3" aria-live="polite">
      {branches.length > 1 ? (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{labels.chooseBranch}</span>
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy outline-none focus:ring-2 focus:ring-primary/25">
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name} — {branch.address}</option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        onClick={claim}
        disabled={!claimable || state === 'loading' || !branchId}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-white shadow-[0_10px_25px_rgba(245,89,55,.24)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'loading' ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <QrIcon className="size-5" aria-hidden />}
        {state === 'loading' ? labels.claiming : claimable ? labels.button : labels.unavailable}
      </button>
      {error ? (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
          {error.message}
          {error.code === 'ALREADY_CLAIMED' ? <a href="/account/codes" className="ml-1 underline">{labels.viewCode}</a> : null}
        </div>
      ) : null}
      {claimable ? <p className="text-xs leading-5 text-slate-500">{labels.hint}</p> : null}
    </div>
  );
}
