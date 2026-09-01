'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Ban, LoaderCircle, Pencil, StopCircle } from 'lucide-react';

import { dealStatusLabels, dealStatusStyles, PRE_LAUNCH_STATUSES } from '@/lib/deal-status';
import { storedUtcToTashkentLocalInput, tashkentLocalToUtcIso } from '@/lib/time';

type ManagedDeal = {
  id: string;
  title: string;
  status: string;
  originalPriceUzs: number | null;
  discountedPriceUzs: number;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  totalQuantity: number | null;
  remainingQuantity: number | null;
};

const formatPrice = (value: number | null) => (value === null ? '' : new Intl.NumberFormat('uz-UZ').format(value));
const formatDateTime = (stored: string) => new Date(`${stored}Z`).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'medium', timeStyle: 'short' });

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function DealManagerCard({ deal }: { deal: ManagedDeal }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isPreLaunch = PRE_LAUNCH_STATUSES.has(deal.status);
  const isLive = deal.status === 'ACTIVE';
  const canEdit = isPreLaunch || isLive;

  async function cancelDeal() {
    if (!window.confirm('Aksiyani bekor qilishni tasdiqlaysizmi? Bu ro‘yxatdan butunlay olib tashlanadi.')) return;
    setBusy(true);
    setError('');
    const response = await fetch(`/api/v1/business/deals/${deal.id}/cancel`, { method: 'POST' });
    const result = (await response.json()) as { error?: { message: string } };
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'Bekor qilinmadi.'); return; }
    router.refresh();
  }

  async function stopDeal() {
    if (!window.confirm('Aksiyani hozir to‘xtatishni tasdiqlaysizmi? Bu amalni qaytarib bo‘lmaydi.')) return;
    setBusy(true);
    setError('');
    const response = await fetch(`/api/v1/business/deals/${deal.id}/stop`, { method: 'POST' });
    const result = (await response.json()) as { error?: { message: string } };
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'To‘xtatilmadi.'); return; }
    router.refresh();
  }

  async function saveEdit(formData: FormData) {
    setBusy(true);
    setError('');
    const payload: Record<string, unknown> = {};

    if (isPreLaunch) {
      const title = textField(formData, 'title'); if (title) payload.title = title;
      const description = textField(formData, 'description'); if (description) payload.description = description;
      const terms = textField(formData, 'terms'); if (terms) payload.terms = terms;
      const originalPriceUzs = textField(formData, 'originalPriceUzs'); if (originalPriceUzs) payload.originalPriceUzs = Number(originalPriceUzs);
      const discountedPriceUzs = textField(formData, 'discountedPriceUzs'); if (discountedPriceUzs) payload.discountedPriceUzs = Number(discountedPriceUzs);
      const totalQuantity = textField(formData, 'totalQuantity'); if (totalQuantity) payload.totalQuantity = Number(totalQuantity);
      const startsAtLocal = textField(formData, 'startsAt'); if (startsAtLocal) payload.startsAt = tashkentLocalToUtcIso(startsAtLocal);
      const endsAtLocal = textField(formData, 'endsAt'); if (endsAtLocal) payload.endsAt = tashkentLocalToUtcIso(endsAtLocal);
    } else {
      const discountedPriceUzs = textField(formData, 'discountedPriceUzs'); if (discountedPriceUzs) payload.discountedPriceUzs = Number(discountedPriceUzs);
      const totalQuantity = textField(formData, 'totalQuantity'); if (totalQuantity) payload.totalQuantity = Number(totalQuantity);
      const endsAtLocal = textField(formData, 'endsAt'); if (endsAtLocal) payload.endsAt = tashkentLocalToUtcIso(endsAtLocal);
    }

    if (Object.keys(payload).length === 0) { setBusy(false); setEditing(false); return; }

    const response = await fetch(`/api/v1/business/deals/${deal.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: { message: string } };
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'Saqlanmadi.'); return; }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{deal.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-bold text-primary">-{deal.discountPercent}%</span>
            <span>{formatPrice(deal.discountedPriceUzs)} so‘m</span>
            {deal.originalPriceUzs ? <span className="text-slate-400 line-through">{formatPrice(deal.originalPriceUzs)}</span> : null}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {formatDateTime(deal.startsAt)} → {formatDateTime(deal.endsAt)} ·{' '}
            {deal.totalQuantity === null ? 'cheklanmagan' : `${deal.remainingQuantity ?? 0}/${deal.totalQuantity} dona qoldi`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${dealStatusStyles[deal.status] ?? dealStatusStyles.DRAFT}`}>{dealStatusLabels[deal.status] ?? deal.status}</span>
      </div>

      {error ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"><AlertTriangle className="size-4 shrink-0" /> {error}</p> : null}

      {canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button onClick={() => setEditing((value) => !value)} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-50">
            <Pencil className="size-3.5" /> {editing ? 'Yopish' : 'Tahrirlash'}
          </button>
          {isPreLaunch ? (
            <button onClick={cancelDeal} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50">
              <Ban className="size-3.5" /> Bekor qilish
            </button>
          ) : (
            <button onClick={stopDeal} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50">
              {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <StopCircle className="size-3.5" />} Hozir to‘xtatish
            </button>
          )}
        </div>
      ) : null}

      {editing ? (
        <form action={saveEdit} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          {isPreLaunch ? (
            <>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nomi</span>
                <input name="title" defaultValue={deal.title} minLength={3} maxLength={140} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Eski narx</span>
                <input name="originalPriceUzs" type="number" min={0} step={1000} defaultValue={deal.originalPriceUzs ?? ''} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Chegirmali narx</span>
                <input name="discountedPriceUzs" type="number" min={100} step={1000} defaultValue={deal.discountedPriceUzs} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Boshlanish</span>
                <input name="startsAt" type="datetime-local" defaultValue={storedUtcToTashkentLocalInput(deal.startsAt)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tugash</span>
                <input name="endsAt" type="datetime-local" defaultValue={storedUtcToTashkentLocalInput(deal.endsAt)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Umumiy miqdor</span>
                <input name="totalQuantity" type="number" min={1} defaultValue={deal.totalQuantity ?? ''} placeholder="Cheklanmagan" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tavsif</span>
                <textarea name="description" minLength={20} maxLength={1200} rows={2} placeholder="O‘zgartirish uchun to‘ldiring, aks holda eskisi qoladi" className="w-full rounded-lg border border-slate-200 p-3 text-sm" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Shartlar</span>
                <textarea name="terms" minLength={10} maxLength={800} rows={2} placeholder="O‘zgartirish uchun to‘ldiring, aks holda eskisi qoladi" className="w-full rounded-lg border border-slate-200 p-3 text-sm" />
              </label>
            </>
          ) : (
            <>
              <p className="sm:col-span-2 text-xs text-slate-500">Aksiya faol — narxni faqat pasaytirish, miqdorni faqat oshirish va tugash vaqtini faqat oldinga surish mumkin.</p>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Yangi chegirmali narx (pastroq)</span>
                <input name="discountedPriceUzs" type="number" min={100} step={1000} max={deal.discountedPriceUzs - 1} placeholder={String(deal.discountedPriceUzs)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
              {deal.totalQuantity !== null ? (
                <label>
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Yangi umumiy miqdor (ko‘proq)</span>
                  <input name="totalQuantity" type="number" min={deal.totalQuantity + 1} placeholder={String(deal.totalQuantity)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                </label>
              ) : null}
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Yangi tugash vaqti (erta)</span>
                <input name="endsAt" type="datetime-local" max={storedUtcToTashkentLocalInput(deal.endsAt)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
              </label>
            </>
          )}
          <button disabled={busy} className="sm:col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white disabled:opacity-60">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null} Saqlash
          </button>
        </form>
      ) : null}
    </div>
  );
}
