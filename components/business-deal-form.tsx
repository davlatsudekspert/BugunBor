'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, ImagePlus, LoaderCircle, Plus, Trash2, X } from 'lucide-react';

import { compressImageToDataUrl } from '@/lib/image';
import { tashkentLocalToUtcIso } from '@/lib/time';

type Tier = { afterHours: string; discountPercent: string };
type TimeSlot = { startsAtLocal: string; capacity: string };

export function BusinessDealForm({ businessId, branches }: { businessId: string; branches: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [listingType, setListingType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [autoDiscountOn, setAutoDiscountOn] = useState(false);
  const [minPriceUzs, setMinPriceUzs] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([{ afterHours: '2', discountPercent: '15' }]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ startsAtLocal: '', capacity: '1' }]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');

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
      listingType,
      minPriceUzs: autoDiscountOn && minPriceUzs ? minPriceUzs : undefined,
      autoDiscountTiers: autoDiscountOn
        ? tiers.filter((tier) => tier.afterHours !== '' && tier.discountPercent !== '').map((tier) => ({ afterHours: Number(tier.afterHours), discountPercent: Number(tier.discountPercent) }))
        : undefined,
      timeSlots: listingType === 'SERVICE'
        ? timeSlots.filter((slot) => slot.startsAtLocal !== '').map((slot) => ({ startsAt: tashkentLocalToUtcIso(slot.startsAtLocal), capacity: Number(slot.capacity) || 1 }))
        : undefined,
      businessId,
      imageUrl: imageDataUrl ?? undefined,
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

  async function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets picking the same file again re-fire onChange
    if (!file) return;
    setImageError('');
    setImageBusy(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      if (!compressed) { setImageError('Bu faylni rasm sifatida ochib bo‘lmadi yoki u juda katta — boshqasini tanlang.'); return; }
      setImageDataUrl(compressed);
    } finally {
      setImageBusy(false);
    }
  }

  function updateTier(index: number, field: keyof Tier, value: string) {
    setTiers((current) => current.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)));
  }

  function updateSlot(index: number, field: keyof TimeSlot, value: string) {
    setTimeSlots((current) => current.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)));
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
        <div className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Aksiya rasmi (ixtiyoriy)</span>
          {imageDataUrl ? (
            <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200 sm:w-64">
              <img src={imageDataUrl} alt="" className="size-full object-cover" />
              <button type="button" onClick={() => setImageDataUrl(null)} aria-label="Rasmni olib tashlash" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500 hover:border-primary hover:text-primary sm:w-64">
              {imageBusy ? <LoaderCircle className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
              {imageBusy ? 'Tayyorlanmoqda…' : 'Rasm tanlash'}
              <input type="file" accept="image/*" onChange={pickImage} disabled={imageBusy} className="hidden" />
            </label>
          )}
          {imageError ? <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-700"><AlertTriangle className="size-4" /> {imageError}</p> : null}
          <p className="mt-2 text-xs text-slate-400">Rasm bo‘lmasa, aksiya standart rangli fon bilan ko‘rinadi.</p>
        </div>

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

        <div className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Turi</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setListingType('PRODUCT')} className={`h-11 flex-1 rounded-xl border text-sm font-bold ${listingType === 'PRODUCT' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600'}`}>📦 Mahsulot</button>
            <button type="button" onClick={() => setListingType('SERVICE')} className={`h-11 flex-1 rounded-xl border text-sm font-bold ${listingType === 'SERVICE' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600'}`}>🗓️ Xizmat (vaqt-slot bilan)</button>
          </div>
        </div>

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

      {listingType === 'SERVICE' ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-black">Vaqt-slotlar</p>
          <p className="mt-1 text-sm text-slate-500">Mijoz aynan shu vaqtlardan birini band qiladi (masalan, soch olish 15:00 da).</p>
          <div className="mt-4 space-y-2">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-2">
                <input type="datetime-local" value={slot.startsAtLocal} onChange={(event) => updateSlot(index, 'startsAtLocal', event.target.value)} className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                <input type="number" min={1} max={50} value={slot.capacity} onChange={(event) => updateSlot(index, 'capacity', event.target.value)} placeholder="Sig'imi" className="h-11 w-24 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                <button type="button" onClick={() => setTimeSlots((current) => current.filter((_, i) => i !== index))} aria-label="Slotni o‘chirish" className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTimeSlots((current) => [...current, { startsAtLocal: '', capacity: '1' }])} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-primary"><Plus className="size-4" /> Yana slot qo‘shish</button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={autoDiscountOn} onChange={(event) => setAutoDiscountOn(event.target.checked)} className="size-4 rounded border-slate-300" />
          Avto Skidka — vaqt o‘tgani sayin chegirma avtomatik chuqurlashsin
        </label>
        {autoDiscountOn ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-500">Masalan, boshlanganidan 2 soat keyin -15%, 4 soat keyin -25% bo‘lsin.</p>
            <label className="block max-w-xs"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Minimal narx (so‘m, ixtiyoriy — bundan pastga tushmaydi)</span><input type="number" min={0} step={1000} value={minPriceUzs} onChange={(event) => setMinPriceUzs(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" /></label>
            <div className="space-y-2">
              {tiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Boshlanganidan</span>
                  <input type="number" min={0} max={1000} value={tier.afterHours} onChange={(event) => updateTier(index, 'afterHours', event.target.value)} className="h-11 w-20 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm" />
                  <span className="text-sm text-slate-500">soat keyin</span>
                  <input type="number" min={1} max={95} value={tier.discountPercent} onChange={(event) => updateTier(index, 'discountPercent', event.target.value)} className="h-11 w-20 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm" />
                  <span className="text-sm text-slate-500">% chegirma</span>
                  <button type="button" onClick={() => setTiers((current) => current.filter((_, i) => i !== index))} aria-label="Bosqichni o‘chirish" className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setTiers((current) => [...current, { afterHours: '', discountPercent: '' }])} className="flex items-center gap-1.5 text-sm font-bold text-primary"><Plus className="size-4" /> Yana bosqich qo‘shish</button>
          </div>
        ) : null}
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
