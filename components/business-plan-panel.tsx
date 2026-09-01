'use client';

import { useState } from 'react';
import { Check, CreditCard, LoaderCircle, Sparkles, X } from 'lucide-react';

import type { PlanPrice } from '@/modules/billing/nfcstore-discount';

const formatUzs = (value: number) => new Intl.NumberFormat('uz-UZ').format(value);

// Mirrors the real, enforced differences: FREE's 2-active-deal cap lives in
// POST /api/v1/business/deals; sponsored placement's Pro gate lives in
// POST /api/v1/admin/deals/:id/sponsor. Keep this list in sync with both if either changes.
const COMPARISON: Array<{ label: string; free: boolean; pro: boolean }> = [
  { label: 'Bir vaqtda 2 tagacha faol aksiya', free: true, pro: true },
  { label: 'Cheksiz faol aksiya', free: false, pro: true },
  { label: 'Qidiruvda ustuvor (sponsored) joylashuv', free: false, pro: true },
  { label: 'Ustuvor qo‘llab-quvvatlash', free: false, pro: true },
];

/**
 * The business cabinet's plan block (/business/dashboard) — a real Free-vs-Pro comparison and
 * the "Pro sotib olish" checkout button, wired to POST /api/v1/business/plan/checkout. That
 * endpoint 503s with a clear message rather than a fake success when Payme isn't configured
 * yet (modules/billing/payme.ts) — this panel just surfaces whatever it says, never invents
 * its own "paid" state.
 */
export function BusinessPlanPanel({
  businessId,
  planCode,
  planName,
  subscriptionStatus,
  planPrice,
  canManage,
}: {
  businessId: string;
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  planPrice: PlanPrice;
  canManage: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isProActive = planCode === 'PRO' && subscriptionStatus === 'ACTIVE';

  async function buyPro() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/business/plan/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      const result = (await response.json()) as { data?: { checkoutUrl: string }; error?: { message: string } };
      if (!response.ok) {
        setBusy(false);
        setError(result.error?.message ?? 'To‘lov boshlanmadi.');
        return;
      }
      window.location.href = result.data!.checkoutUrl;
    } catch {
      // A network drop or a non-JSON error response (a 502 HTML page, a dropped connection)
      // must never leave the button stuck spinning forever with no way to retry — see
      // components/claim-button.tsx's identical fix for the same missing try/catch.
      setBusy(false);
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black"><Sparkles className="size-5 text-orange-500" /> Reja va tarif</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isProActive ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
          Joriy: {planName}{planCode === 'PRO' && subscriptionStatus !== 'ACTIVE' ? ` (${subscriptionStatus})` : ''}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(['FREE', 'PRO'] as const).map((code) => (
          <div key={code} className={`rounded-xl border p-4 ${planCode === code ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
            <p className="flex items-center justify-between text-sm font-black">
              {code === 'FREE' ? 'Bepul' : 'Pro'}
              {planCode === code ? <span className="text-xs font-bold text-primary">Joriy reja</span> : null}
            </p>
            <p className="mt-1 text-lg font-black">
              {code === 'FREE' ? '0 so‘m' : `${formatUzs(planPrice.finalPriceUzs)} so‘m/oy`}
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
              {COMPARISON.map((row) => {
                const included = code === 'FREE' ? row.free : row.pro;
                return (
                  <li key={row.label} className="flex items-center gap-1.5">
                    {included ? <Check className="size-3.5 shrink-0 text-emerald-600" /> : <X className="size-3.5 shrink-0 text-slate-300" />}
                    <span className={included ? '' : 'text-slate-400'}>{row.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

      {canManage && !isProActive ? (
        <button onClick={buyPro} disabled={busy} className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white disabled:opacity-60">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />} Pro sotib olish
        </button>
      ) : null}
      {isProActive ? <p className="mt-4 text-sm font-bold text-emerald-700">✅ Siz Pro rejadasiz — barcha imkoniyatlar faol.</p> : null}
      {planPrice.discountPercent > 0 ? (
        <p className="mt-2 text-xs text-emerald-700">NFCStore Business tasdiqlangani uchun narxdan -{planPrice.discountPercent}% chegirma qo‘llanadi.</p>
      ) : null}
    </div>
  );
}
