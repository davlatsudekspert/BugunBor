'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Plus } from 'lucide-react';

export function PromoCodeForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError('');
    const rawCode = formData.get('code');
    const rawDiscountType = formData.get('discountType');
    const rawDiscountValue = formData.get('discountValue');
    const rawMaxUses = formData.get('maxUses');
    const rawExpiresAt = formData.get('expiresAt');
    const code = typeof rawCode === 'string' ? rawCode.trim() : '';
    const discountType = typeof rawDiscountType === 'string' ? rawDiscountType : 'PERCENT';
    const discountValue = typeof rawDiscountValue === 'string' ? Number(rawDiscountValue) : 0;
    const maxUses = typeof rawMaxUses === 'string' && rawMaxUses.trim() ? Number(rawMaxUses) : undefined;
    const expiresAtLocal = typeof rawExpiresAt === 'string' && rawExpiresAt ? rawExpiresAt : undefined;
    // Uzbekistan is a fixed UTC+5 offset year-round — see lib/time.ts.
    const expiresAt = expiresAtLocal ? `${expiresAtLocal}:00+05:00` : undefined;

    const response = await fetch('/api/v1/admin/promo-codes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, discountType, discountValue, maxUses, expiresAt }),
    });
    const result = (await response.json()) as { error?: { message: string } };
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'Yaratilmadi.'); return; }
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:grid-cols-2">
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Kod</span><input required name="code" placeholder="BUGUN10" maxLength={24} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-mono uppercase" /></label>
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Turi</span><select name="discountType" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="PERCENT">Foiz (%)</option><option value="FIXED">Aniq summa (so‘m)</option></select></label>
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Qiymati</span><input required type="number" min={1} name="discountValue" placeholder="10" className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Maksimal ishlatish soni (ixtiyoriy)</span><input type="number" min={1} name="maxUses" placeholder="Cheklanmagan" className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Amal qilish muddati (ixtiyoriy)</span><input type="datetime-local" name="expiresAt" className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      {error ? <p className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      <button disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60 sm:col-span-2 sm:w-fit">
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Promokod yaratish
      </button>
    </form>
  );
}
