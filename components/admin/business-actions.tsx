'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Ban, CheckCircle2, LoaderCircle, Radio, RotateCcw, Sparkles } from 'lucide-react';

import { NFCSTORE_STATUS_LABELS, NFCSTORE_STATUS_STYLES } from '@/lib/nfcstore';
import { computeEffectivePlanPriceUzs } from '@/modules/billing/nfcstore-discount';

type Business = {
  id: string;
  name: string;
  city: string;
  verificationStatus: string;
  planId: string;
  planName: string;
  subscriptionStatus: string;
  createdAt: string;
  nfcstoreBusinessUrl: string | null;
  nfcstoreStatus: string;
  nfcstoreVerifiedAt: string | null;
  nfcstoreLastCheckedAt: string | null;
  nfcstoreDiscountEligible: number;
  planPriceUzs: number;
};

type ActiveDeal = { id: string; title: string; isSponsored: number };

const statusStyles: Record<string, string> = {
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  REJECTED: 'bg-red-50 text-red-700',
  UNVERIFIED: 'bg-slate-100 text-slate-600',
};

export function BusinessActions({
  business,
  plans,
  canManage,
  canManagePlan,
  activeDeals,
}: {
  business: Business;
  plans: Array<{ id: string; name: string }>;
  canManage: boolean;
  canManagePlan: boolean;
  activeDeals: ActiveDeal[];
}) {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState(business.verificationStatus);
  const [planId, setPlanId] = useState(business.planId);
  const [subscriptionStatus, setSubscriptionStatus] = useState(business.subscriptionStatus);
  const [nfcstoreStatus, setNfcstoreStatus] = useState(business.nfcstoreStatus);
  const [sponsored, setSponsored] = useState<Record<string, boolean>>(Object.fromEntries(activeDeals.map((deal) => [deal.id, Boolean(deal.isSponsored)])));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isProActive = planId === 'plan_pro' && subscriptionStatus === 'ACTIVE';
  const planPrice = computeEffectivePlanPriceUzs(business.planPriceUzs, nfcstoreStatus === 'VERIFIED');
  const formatUzs = (value: number) => new Intl.NumberFormat('uz-UZ').format(value);

  async function decide(decision: 'VERIFY' | 'REJECT' | 'SUSPEND' | 'REINSTATE') {
    const reason = window.prompt('Qaror sababini yozing (kamida 10 belgi):');
    if (!reason || reason.trim().length < 10) return;
    setBusy('decision');
    setError('');
    const response = await fetch(`/api/v1/admin/businesses/${business.id}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    });
    const result = (await response.json()) as { data?: { verificationStatus: string }; error?: { message: string } };
    setBusy(null);
    if (!response.ok) { setError(result.error?.message ?? 'Amal bajarilmadi.'); return; }
    setVerificationStatus(result.data!.verificationStatus);
    router.refresh();
  }

  async function decideNfcStore(decision: 'VERIFY' | 'REJECT' | 'SUSPEND' | 'REINSTATE') {
    const reason = window.prompt('Qaror sababini yozing (kamida 10 belgi):');
    if (!reason || reason.trim().length < 10) return;
    setBusy('nfcstore');
    setError('');
    const response = await fetch(`/api/v1/admin/businesses/${business.id}/nfcstore-decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    });
    const result = (await response.json()) as { data?: { nfcstoreStatus: string }; error?: { message: string } };
    setBusy(null);
    if (!response.ok) { setError(result.error?.message ?? 'Amal bajarilmadi.'); return; }
    setNfcstoreStatus(result.data!.nfcstoreStatus);
    router.refresh();
  }

  async function savePlan() {
    setBusy('plan');
    setError('');
    const response = await fetch(`/api/v1/admin/businesses/${business.id}/plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ planId, subscriptionStatus }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    setBusy(null);
    if (!response.ok) { setError(result.error?.message ?? 'Reja saqlanmadi.'); return; }
    router.refresh();
  }

  async function toggleSponsor(dealId: string, next: boolean) {
    setBusy(dealId);
    setError('');
    const response = await fetch(`/api/v1/admin/deals/${dealId}/sponsor`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sponsored: next }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    setBusy(null);
    if (!response.ok) { setError(result.error?.message ?? 'O‘zgartirilmadi.'); return; }
    setSponsored((current) => ({ ...current, [dealId]: next }));
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-black">{business.name}
            {verificationStatus === 'VERIFIED' ? <BadgeCheck className="size-4 text-emerald-500" /> : null}
          </p>
          <p className="text-sm text-slate-500">{business.city} · {new Date(business.createdAt).toLocaleDateString('uz-UZ')}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[verificationStatus] ?? statusStyles.UNVERIFIED}`}>{verificationStatus}</span>
      </div>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {verificationStatus !== 'VERIFIED' ? (
              <button onClick={() => decide('VERIFY')} disabled={busy !== null} className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                {busy === 'decision' ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Tasdiqlash
              </button>
            ) : null}
            {verificationStatus !== 'REJECTED' ? (
              <button onClick={() => decide('SUSPEND')} disabled={busy !== null} className="flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50">
                <Ban className="size-3.5" /> To‘xtatish
              </button>
            ) : (
              <button onClick={() => decide('REINSTATE')} disabled={busy !== null} className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">
                <RotateCcw className="size-3.5" /> Qayta tiklash
              </button>
            )}
          </div>
        ) : null}

        {canManagePlan ? (
          <div className="flex flex-wrap items-center gap-2">
            <select value={planId} onChange={(event) => setPlanId(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold">
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            <select value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold">
              <option value="FREE">FREE</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAST_DUE">PAST_DUE</option>
              <option value="CANCELED">CANCELED</option>
            </select>
            <button onClick={savePlan} disabled={busy !== null} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:opacity-50">
              {busy === 'plan' ? <LoaderCircle className="size-3.5 animate-spin" /> : null} Rejani saqlash
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500">Reja: {business.planName}</span>
        )}
        {planPrice.discountPercent > 0 ? (
          <span className="text-xs font-bold text-emerald-700">{formatUzs(planPrice.basePriceUzs)} → {formatUzs(planPrice.finalPriceUzs)} so‘m (NFCStore -{planPrice.discountPercent}%)</span>
        ) : null}
      </div>

      {business.nfcstoreBusinessUrl ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><Radio className="size-3.5 text-primary" /> NFCStore Business</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${NFCSTORE_STATUS_STYLES[nfcstoreStatus] ?? NFCSTORE_STATUS_STYLES.NOT_CONNECTED}`}>{NFCSTORE_STATUS_LABELS[nfcstoreStatus] ?? nfcstoreStatus}</span>
          </div>
          <a href={business.nfcstoreBusinessUrl} target="_blank" rel="noreferrer" className="mt-1.5 block truncate text-xs text-slate-500 underline-offset-2 hover:underline">{business.nfcstoreBusinessUrl}</a>
          {business.nfcstoreVerifiedAt ? <p className="mt-1 text-xs text-slate-400">Tasdiqlangan: {new Date(business.nfcstoreVerifiedAt).toLocaleString('uz-UZ')}</p> : null}
          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {nfcstoreStatus !== 'VERIFIED' ? (
                <button onClick={() => decideNfcStore('VERIFY')} disabled={busy !== null} className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                  {busy === 'nfcstore' ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Tasdiqlash
                </button>
              ) : null}
              {nfcstoreStatus === 'PENDING_VERIFICATION' ? (
                <button onClick={() => decideNfcStore('REJECT')} disabled={busy !== null} className="flex h-8 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50">
                  <Ban className="size-3.5" /> Rad etish
                </button>
              ) : null}
              {nfcstoreStatus === 'VERIFIED' ? (
                <button onClick={() => decideNfcStore('SUSPEND')} disabled={busy !== null} className="flex h-8 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50">
                  <Ban className="size-3.5" /> To‘xtatish
                </button>
              ) : null}
              {nfcstoreStatus === 'SUSPENDED' ? (
                <button onClick={() => decideNfcStore('REINSTATE')} disabled={busy !== null} className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">
                  <RotateCcw className="size-3.5" /> Qayta tiklash
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {canManage && activeDeals.length ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Sparkles className="size-3.5 text-orange-400" /> Qidiruvda ustuvor joylashuv {isProActive ? null : <span className="font-normal normal-case text-slate-400">(faqat faol Pro obuna uchun)</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeDeals.map((deal) => {
              const isSponsored = sponsored[deal.id] ?? false;
              const disabled = busy !== null || (!isSponsored && !isProActive);
              return (
                <label key={deal.id} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${isSponsored ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600'} ${disabled && !isSponsored ? 'opacity-50' : ''}`}>
                  <input type="checkbox" checked={isSponsored} disabled={disabled} onChange={(event) => toggleSponsor(deal.id, event.target.checked)} className="size-3.5" />
                  {deal.title}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
