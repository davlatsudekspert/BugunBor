'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, LoaderCircle, Plus, Trash2 } from 'lucide-react';

type SlotDraft = { startsAt: string; capacity: string };

/** The form collects Asia/Tashkent local time (Uzbekistan runs a fixed UTC+5, no DST)
 * and converts to a UTC ISO instant before it hits the API — display elsewhere in the
 * app already assumes stored timestamps are UTC. */
function tashkentLocalToUtcIso(local: string) {
  if (!local) return '';
  return new Date(`${local}:00+05:00`).toISOString();
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export function DealForm({
  businessId,
  branches,
  categories,
}: {
  businessId: string;
  branches: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [dealType, setDealType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [imageUrlsText, setImageUrlsText] = useState('');
  const [slots, setSlots] = useState<SlotDraft[]>([
    { startsAt: '', capacity: '1' },
  ]);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  const discountPercent = useMemo(() => {
    const original = Number(originalPrice);
    const discounted = Number(discountedPrice);
    if (!original || !discounted || discounted >= original) return null;
    return Math.round(((original - discounted) / original) * 100);
  }, [originalPrice, discountedPrice]);

  async function submit(formData: FormData) {
    setState('loading');
    setMessage('');
    const imageUrls = imageUrlsText
      .split(/\s+/)
      .map((url) => url.trim())
      .filter(Boolean);
    const payload: Record<string, unknown> = {
      businessId,
      branchId: formData.get('branchId'),
      categoryId: formData.get('categoryId'),
      dealType,
      title: formData.get('title'),
      description: formData.get('description'),
      terms: formData.get('terms'),
      originalPriceUzs: Number(originalPrice),
      discountedPriceUzs: Number(discountedPrice),
      startsAt: tashkentLocalToUtcIso(readString(formData, 'startsAt')),
      endsAt: tashkentLocalToUtcIso(readString(formData, 'endsAt')),
      perCustomerLimit:
        formData.get('perCustomerLimit') === 'unlimited'
          ? null
          : Number(formData.get('perCustomerLimit')),
      imageUrls,
    };
    if (dealType === 'PRODUCT') {
      payload.totalQuantity = Number(formData.get('totalQuantity'));
    } else {
      payload.slots = slots
        .filter((slot) => slot.startsAt && slot.capacity)
        .map((slot) => ({
          startsAt: tashkentLocalToUtcIso(slot.startsAt),
          capacity: Number(slot.capacity),
        }));
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (window.location.hostname === 'localhost')
      headers['x-bugunbor-demo-user'] = 'usr_owner_browser';
    const response = await fetch('/api/v1/deals', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as {
      data?: { slug: string };
      error?: { message: string };
    };
    if (!response.ok) {
      setState('error');
      setMessage(result.error?.message ?? 'E’lon yaratilmadi.');
      return;
    }
    setState('success');
    setMessage(
      'E’lon moderatsiyaga yuborildi. Tasdiqlangach, belgilangan vaqtda avtomatik ochiladi.',
    );
  }

  function updateSlot(index: number, field: keyof SlotDraft, value: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    );
  }

  if (state === 'success') {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-4 text-2xl font-black text-emerald-950">Yuborildi</h2>
        <p className="mt-2 text-emerald-800">{message}</p>
        <a
          href="/business/dashboard"
          className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-900"
        >
          Dashboardga qaytish
        </a>
      </div>
    );
  }

  return (
    <form
      action={submit}
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(20,40,55,.08)] sm:p-8"
    >
      <fieldset className="flex gap-3" aria-label="E’lon turi">
        {(['PRODUCT', 'SERVICE'] as const).map((type) => (
          <label
            key={type}
            className={`flex-1 cursor-pointer rounded-xl border p-3 text-center text-sm font-bold ${dealType === type ? 'border-primary bg-orange-50 text-primary' : 'border-slate-200 text-slate-600'}`}
          >
            <input
              type="radio"
              name="dealType"
              className="sr-only"
              checked={dealType === type}
              onChange={() => setDealType(type)}
            />
            {type === 'PRODUCT' ? '📦 Mahsulot' : '✂️ Xizmat'}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Nomi</span>
          <input
            required
            name="title"
            minLength={6}
            maxLength={160}
            placeholder="Erkaklar uchun oq krossovka — 42 razmer"
            className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold">Kategoriya</span>
          <select
            required
            name="categoryId"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">Filial</span>
          <select
            required
            name="branchId"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold">
            Oddiy narx (so‘m)
          </span>
          <input
            required
            type="number"
            min={1000}
            value={originalPrice}
            onChange={(event) => setOriginalPrice(event.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 px-4"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">
            BugunBor narxi (so‘m)
          </span>
          <input
            required
            type="number"
            min={1000}
            value={discountedPrice}
            onChange={(event) => setDiscountedPrice(event.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 px-4"
          />
        </label>
        {discountPercent !== null ? (
          <p className="sm:col-span-2 -mt-3 text-sm font-bold text-primary">
            Avtomatik chegirma: -{discountPercent}%
          </p>
        ) : null}

        <label>
          <span className="mb-2 block text-sm font-bold">
            Boshlanish (Toshkent vaqti)
          </span>
          <input
            required
            type="datetime-local"
            name="startsAt"
            className="h-12 w-full rounded-xl border border-slate-200 px-4"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">
            Tugash (Toshkent vaqti)
          </span>
          <input
            required
            type="datetime-local"
            name="endsAt"
            className="h-12 w-full rounded-xl border border-slate-200 px-4"
          />
        </label>

        {dealType === 'PRODUCT' ? (
          <label>
            <span className="mb-2 block text-sm font-bold">Sotuvda (dona)</span>
            <input
              required
              type="number"
              min={1}
              name="totalQuantity"
              placeholder="7"
              className="h-12 w-full rounded-xl border border-slate-200 px-4"
            />
          </label>
        ) : null}
        <label>
          <span className="mb-2 block text-sm font-bold">
            Bir xaridorga limit
          </span>
          <select
            name="perCustomerLimit"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4"
          >
            <option value="1">1 dona</option>
            <option value="2">2 dona</option>
            <option value="3">3 dona</option>
            <option value="unlimited">Cheklanmagan</option>
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Tavsif</span>
          <textarea
            required
            name="description"
            minLength={20}
            maxLength={2000}
            rows={4}
            className="w-full rounded-xl border border-slate-200 p-4"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">Shartlar</span>
          <textarea
            required
            name="terms"
            minLength={10}
            maxLength={2000}
            rows={3}
            className="w-full rounded-xl border border-slate-200 p-4"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">
            Rasmlar — kamida 2 ta, maksimal 6 ta URL (bo‘sh joy bilan ajrating)
          </span>
          <textarea
            required
            value={imageUrlsText}
            onChange={(event) => setImageUrlsText(event.target.value)}
            rows={2}
            placeholder="https://... https://..."
            className="w-full rounded-xl border border-slate-200 p-4 font-mono text-xs"
          />
        </label>
      </div>

      {dealType === 'SERVICE' ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold">Bo‘sh vaqt slotlari</p>
          <div className="mt-3 space-y-2">
            {slots.map((slot, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={slot.startsAt}
                  onChange={(event) =>
                    updateSlot(index, 'startsAt', event.target.value)
                  }
                  className="h-11 flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  value={slot.capacity}
                  onChange={(event) =>
                    updateSlot(index, 'capacity', event.target.value)
                  }
                  placeholder="Joy soni"
                  className="h-11 w-28 rounded-xl border border-slate-200 px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setSlots((current) =>
                      current.filter((_, slotIndex) => slotIndex !== index),
                    )
                  }
                  className="grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setSlots((current) => [
                ...current,
                { startsAt: '', capacity: '1' },
              ])
            }
            className="mt-3 flex items-center gap-1.5 text-sm font-bold text-primary"
          >
            <Plus className="size-4" /> Slot qo‘shish
          </button>
        </div>
      ) : null}

      {state === 'error' ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </p>
      ) : null}
      <button
        disabled={state === 'loading'}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60"
      >
        {state === 'loading' ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : null}
        {state === 'loading' ? 'Yuborilmoqda…' : 'Rejalashtirish'}
      </button>
    </form>
  );
}
