'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';

/** Uzbekistan runs UTC+5 year-round (no DST), so a datetime-local value picked
 * in the business owner's browser can be converted to a real UTC instant by
 * simply appending that fixed offset before parsing. */
function tashkentLocalToUtcIso(datetimeLocalValue: string) {
  return new Date(`${datetimeLocalValue}:00+05:00`).toISOString();
}

export function BusinessDealForm({ branches }: { branches: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');

  const discountPercent = useMemo(() => {
    const original = Number(originalPrice);
    const discounted = Number(discountedPrice);
    if (!original || !discounted || discounted >= original) return null;
    return Math.round(((original - discounted) / original) * 100);
  }, [originalPrice, discountedPrice]);

  const priceLooksWrong = originalPrice !== '' && discountedPrice !== '' && Number(discountedPrice) >= Number(originalPrice);

  async function submit(formData: FormData) {
    setState('loading');
    setMessage('');
    const rawStartsAt = formData.get('startsAt');
    const rawEndsAt = formData.get('endsAt');
    const startsAtLocal = typeof rawStartsAt === 'string' ? rawStartsAt : '';
    const endsAtLocal = typeof rawEndsAt === 'string' ? rawEndsAt : '';
    const payload = {
      branchId: formData.get('branchId'),
      categoryId: formData.get('categoryId'),
      title: formData.get('title'),
      description: formData.get('description'),
      terms: formData.get('terms'),
      originalPriceUzs: formData.get('originalPriceUzs') || undefined,
      discountedPriceUzs: formData.get('discountedPriceUzs'),
      startsAt: startsAtLocal ? tashkentLocalToUtcIso(startsAtLocal) : undefined,
      endsAt: endsAtLocal ? tashkentLocalToUtcIso(endsAtLocal) : undefined,
      totalQuantity: formData.get('totalQuantity') || undefined,
      perCustomerLimit: formData.get('perCustomerLimit'),
      redemptionMethod: formData.get('redemptionMethod'),
      acceptedRules: formData.get('acceptedRules'),
    };

    const response = await fetch('/api/v1/business/deals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { data?: { slug: string }; error?: { message: string } };
    if (!response.ok) { setState('error'); setMessage(result.error?.message ?? 'Aksiya yuborilmadi.'); return; }
    setState('success');
    setMessage('Aksiya moderatsiyaga yuborildi. Tasdiqlangach faol bo‘ladi.');
    router.refresh();
  }

  if (state === 'success') {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-4 text-2xl font-black text-emerald-950">Yuborildi</h2>
        <p className="mt-2 text-emerald-800">{message}</p>
        <a href="/business/dashboard" className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-900">Dashboardga o‘tish <ArrowRight className="size-4" /></a>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(20,40,55,.08)] sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Aksiya nomi</span>
          <input required name="title" minLength={3} maxLength={140} placeholder="Masalan, Kechki tort chegirmasi" className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-primary/25" />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold">Filial</span>
          <select required name="branchId" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4">
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold">Kategoriya</span>
          <select required name="categoryId" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4">
            <option value="cat_food">Taomlar</option>
            <option value="cat_coffee">Kofe</option>
            <option value="cat_shop">Xaridlar</option>
            <option value="cat_delivery">Yetkazish</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold">Eski narx (so‘m, ixtiyoriy)</span>
          <input name="originalPriceUzs" type="number" min={0} step={1000} value={originalPrice} onChange={(event) => setOriginalPrice(event.target.value)} placeholder="65000" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">Chegirmali narx (so‘m)</span>
          <input required name="discountedPriceUzs" type="number" min={100} step={1000} value={discountedPrice} onChange={(event) => setDiscountedPrice(event.target.value)} placeholder="39000" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
        </label>

        {discountPercent !== null ? (
          <p className="sm:col-span-2 -mt-2 text-sm font-bold text-emerald-700">Ko‘rsatiladigan chegirma: -{discountPercent}%</p>
        ) : null}
        {priceLooksWrong ? (
          <p className="sm:col-span-2 -mt-2 flex items-center gap-2 text-sm font-bold text-red-700"><AlertTriangle className="size-4" /> Chegirmali narx eski narxdan kichik bo‘lishi kerak — soxta chegirma qoidalarga zid.</p>
        ) : null}

        <label>
          <span className="mb-2 block text-sm font-bold">Boshlanish vaqti</span>
          <input required name="startsAt" type="datetime-local" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">Tugash vaqti</span>
          <input required name="endsAt" type="datetime-local" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold">Umumiy miqdor (ixtiyoriy, bo‘sh — cheklanmagan)</span>
          <input name="totalQuantity" type="number" min={1} placeholder="20" className="h-12 w-full rounded-xl border border-slate-200 px-4" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">Bitta mijozga limit</span>
          <input required name="perCustomerLimit" type="number" min={1} max={20} defaultValue={1} className="h-12 w-full rounded-xl border border-slate-200 px-4" />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Band qilish usuli</span>
          <select required name="redemptionMethod" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4">
            <option value="ONSITE_CODE">Filialda kod ko‘rsatish</option>
            <option value="ONLINE_VOUCHER">Onlayn vaucher</option>
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Qisqa tavsif</span>
          <textarea required name="description" minLength={20} maxLength={1200} rows={3} placeholder="Nima uchun bu taklif foydali — aniq va rost yozing…" className="w-full rounded-xl border border-slate-200 p-4" />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Shartlar va cheklovlar</span>
          <textarea required name="terms" minLength={10} maxLength={800} rows={3} placeholder="Masalan: faqat shu filialda, boshqa chegirma bilan qo‘shilmaydi…" className="w-full rounded-xl border border-slate-200 p-4" />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <input required type="checkbox" name="acceptedRules" className="mt-0.5 size-4 shrink-0 rounded border-amber-300" />
        <span>Ushbu aksiyadagi narx, chegirma, miqdor va muddat rost ekanini tasdiqlayman. <a href="/rules" target="_blank" className="font-bold underline underline-offset-2">Qoidalarga</a> ko‘ra, yolg‘on ma’lumot aniqlansa aksiya rad etiladi va biznes profili to‘xtatilishi mumkin.</span>
      </label>

      {state === 'error' ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <button disabled={state === 'loading' || priceLooksWrong} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60">
        {state === 'loading' ? <LoaderCircle className="size-5 animate-spin" /> : null}
        {state === 'loading' ? 'Yuborilmoqda…' : 'Moderatsiyaga yuborish'}
      </button>
    </form>
  );
}
