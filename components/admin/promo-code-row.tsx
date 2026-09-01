'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

type PromoCode = {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
};

export function PromoCodeRow({ promoCode }: { promoCode: PromoCode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/promo-codes/${promoCode.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: !promoCode.isActive }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const expired = promoCode.expiresAt ? new Date(`${promoCode.expiresAt}Z`) <= new Date() : false;
  const usedUp = promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-black tracking-wide">{promoCode.code}</span>
          {!promoCode.isActive ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">O‘chirilgan</span> : null}
          {expired ? <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">Muddati o‘tgan</span> : null}
          {usedUp ? <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">Limit tugagan</span> : null}
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          {promoCode.discountType === 'PERCENT' ? `-${promoCode.discountValue}%` : `-${new Intl.NumberFormat('uz-UZ').format(promoCode.discountValue)} so‘m`}
          {' · '}{promoCode.usedCount} marta ishlatilgan{promoCode.maxUses ? ` / ${promoCode.maxUses}` : ''}
          {promoCode.expiresAt ? ` · ${new Date(`${promoCode.expiresAt}Z`).toLocaleDateString('uz-UZ')} gacha` : ''}
        </p>
      </div>
      <button onClick={toggle} disabled={busy} className={`flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60 ${promoCode.isActive ? 'bg-slate-100 text-slate-700' : 'bg-primary text-white'}`}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null} {promoCode.isActive ? 'O‘chirish' : 'Yoqish'}
      </button>
    </div>
  );
}
