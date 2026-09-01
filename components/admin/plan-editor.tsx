'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LoaderCircle } from 'lucide-react';

type Plan = { id: string; name: string; priceUzs: number; description: string; features: string[]; isActive: boolean };

export function PlanEditor({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [name, setName] = useState(plan.name);
  const [priceUzs, setPriceUzs] = useState(String(plan.priceUzs));
  const [description, setDescription] = useState(plan.description);
  const [featuresText, setFeaturesText] = useState(plan.features.join('\n'));
  const [isActive, setIsActive] = useState(plan.isActive);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    setSaved(false);
    const features = featuresText.split('\n').map((line) => line.trim()).filter(Boolean);
    try {
      const response = await fetch(`/api/v1/admin/plans/${plan.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, priceUzs: Number(priceUzs), description, features, isActive }),
      });
      const result = (await response.json()) as { error?: { message: string } };
      if (!response.ok) { setError(result.error?.message ?? 'Saqlanmadi.'); return; }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nomi</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-lg font-black" />
      </label>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Oylik narx (so‘m)</span>
        <input type="number" min={0} value={priceUzs} onChange={(event) => setPriceUzs(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-bold" />
      </label>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tavsif</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
      </label>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Imkoniyatlar (har biri alohida qatorda)</span>
        <textarea value={featuresText} onChange={(event) => setFeaturesText(event.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
      </label>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="size-4 rounded border-slate-300" />
        Reja faol (bizneslar tanlashi mumkin)
      </label>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <button onClick={save} disabled={busy} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : saved ? <CheckCircle2 className="size-4" /> : null}
        {saved ? 'Saqlandi' : 'O‘zgarishlarni saqlash'}
      </button>
    </div>
  );
}
