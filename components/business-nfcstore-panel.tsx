'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, LoaderCircle, Radio, Trash2 } from 'lucide-react';

import { NFCSTORE_STATUS_LABELS, NFCSTORE_STATUS_STYLES } from '@/lib/nfcstore';
import type { PlanPrice } from '@/modules/billing/nfcstore-discount';

const formatUzs = (value: number) => new Intl.NumberFormat('uz-UZ').format(value);

/**
 * The business cabinet's NFCStore Business block (/business/dashboard) — connect/disconnect
 * a profile and see the real, server-computed tariff price (see
 * modules/billing/nfcstore-discount.ts). Read-only for non-owners (`canManage=false`): the
 * action affects billing, so only OWNER carries `nfcstore.manage` (modules/auth/authorization.ts).
 */
export function BusinessNfcStorePanel({
  businessId,
  status,
  profileUrl,
  planName,
  planPrice,
  canManage,
}: {
  businessId: string;
  status: string;
  profileUrl: string | null;
  planName: string;
  planPrice: PlanPrice;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(!profileUrl);

  async function connect(formData: FormData) {
    const nfcstoreBusinessUrl = formData.get('nfcstoreBusinessUrl');
    if (typeof nfcstoreBusinessUrl !== 'string' || !nfcstoreBusinessUrl.trim()) return;
    setBusy(true);
    setError('');
    const response = await fetch('/api/v1/business/nfcstore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ businessId, nfcstoreBusinessUrl }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'Ulanmadi.'); return; }
    setEditing(false);
    router.refresh();
  }

  async function disconnect() {
    if (!window.confirm('NFCStore Business profilini uzishni tasdiqlaysizmi? Faol chegirma bo‘lsa, keyingi tarif davridan boshlab bekor bo‘ladi.')) return;
    setBusy(true);
    setError('');
    const response = await fetch('/api/v1/business/nfcstore', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ businessId }),
    });
    setBusy(false);
    if (!response.ok) { setError('Uzilmadi.'); return; }
    setEditing(true);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black"><Radio className="size-5 text-primary" /> NFCStore Business</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${NFCSTORE_STATUS_STYLES[status] ?? NFCSTORE_STATUS_STYLES.NOT_CONNECTED}`}>{NFCSTORE_STATUS_LABELS[status] ?? status}</span>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        Joriy reja: <strong>{planName}</strong> ·{' '}
        {planPrice.discountPercent > 0 ? (
          <>
            <span className="text-slate-400 line-through">{formatUzs(planPrice.basePriceUzs)}</span>{' '}
            <strong className="text-emerald-700">{formatUzs(planPrice.finalPriceUzs)} so‘m/oy</strong>{' '}
            <span className="text-emerald-700">(NFCStore -{planPrice.discountPercent}%)</span>
          </>
        ) : (
          <strong>{formatUzs(planPrice.basePriceUzs)} so‘m/oy</strong>
        )}
      </p>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

      {!canManage ? null : profileUrl && !editing ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <a href={profileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-[#152a3b] hover:text-primary">
              <ExternalLink className="size-4" /> NFCStore profilini ko‘rish
            </a>
            <button onClick={() => setEditing(true)} className="text-sm font-bold text-slate-500 hover:text-primary">Havolani almashtirish</button>
            <button onClick={disconnect} disabled={busy} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-red-600 disabled:opacity-50">
              {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Uzish
            </button>
          </div>
          {status === 'VERIFIED' ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              NFCStore profilingizda BugunBor aksiyalaringiz avtomatik chiqishi uchun NFCStore jamoasiga shu manzilni bering:{' '}
              <code className="break-all rounded bg-white px-1.5 py-0.5 text-[11px] text-[#152a3b]">/api/v1/nfcstore/active-deals?profileUrl={encodeURIComponent(profileUrl)}</code>
            </p>
          ) : null}
        </div>
      ) : (
        <form action={connect} className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <input
            name="nfcstoreBusinessUrl"
            defaultValue={profileUrl ?? ''}
            placeholder="https://nfcstore.uz/..."
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/25"
          />
          <button disabled={busy} className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null} Ulash
          </button>
          {profileUrl ? <button type="button" onClick={() => setEditing(false)} className="text-sm font-bold text-slate-500">Bekor qilish</button> : null}
        </form>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Majburiy emas. Tasdiqlangan NFCStore Business profilingizni ulasangiz BugunBor tarifiga 10% chegirma beriladi — tekshiruv admin tomonidan qo‘lda tasdiqlanadi.
      </p>
    </div>
  );
}
