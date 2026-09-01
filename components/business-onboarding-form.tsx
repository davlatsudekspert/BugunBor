'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';

import { useRegionDistrict } from '@/hooks/use-region-district';

export function BusinessOnboardingForm() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { region, setRegion, district, setDistrict, districts, regions } = useRegionDistrict();

  async function submit(formData: FormData) {
    setState('loading');
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (window.location.hostname === 'localhost') headers['x-bugunbor-demo-user'] = 'usr_owner_browser';
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch('/api/v1/businesses', { method: 'POST', headers, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: { slug: string }; error?: { message: string } };
    if (!response.ok) { setState('error'); setMessage(result.error?.message ?? 'Ariza yuborilmadi.'); return; }
    setState('success');
    setMessage('Ariza qabul qilindi. Moderator tekshiruvi boshlandi.');
  }

  if (state === 'success') return <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center"><CheckCircle2 className="mx-auto size-12 text-emerald-600" /><h2 className="mt-4 text-2xl font-black text-emerald-950">Ariza yuborildi</h2><p className="mt-2 text-emerald-800">{message}</p><a href="/business/dashboard" className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-900">Dashboardga o‘tish <ArrowRight className="size-4" /></a></div>;

  return (
    <form action={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(20,40,55,.08)] sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Biznes nomi</span><input required name="name" minLength={2} maxLength={120} placeholder="Masalan, Oqtepa Lavash" className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-primary/25" /></label>
        <label><span className="mb-2 block text-sm font-bold">Kategoriya</span><select required name="categoryId" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4"><option value="cat_food">Taomlar</option><option value="cat_coffee">Kofe</option><option value="cat_shop">Xaridlar</option><option value="cat_delivery">Yetkazish</option></select></label>
        <label><span className="mb-2 block text-sm font-bold">Viloyat</span><select required name="region" value={region} onChange={(event) => setRegion(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4">{regions.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}</select></label>
        <label><span className="mb-2 block text-sm font-bold">Tuman / shahar</span><select required name="city" value={district} onChange={(event) => setDistrict(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4">{districts.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label><span className="mb-2 block text-sm font-bold">Telefon</span><input required name="phone" pattern="\+998\d{9}" defaultValue="+998" className="h-12 w-full rounded-xl border border-slate-200 px-4" /></label>
        <label><span className="mb-2 block text-sm font-bold">Asosiy filial manzili</span><input required name="address" minLength={8} placeholder="Ko‘cha, uy" className="h-12 w-full rounded-xl border border-slate-200 px-4" /></label>
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Qisqa tavsif</span><textarea required name="description" minLength={20} maxLength={1200} rows={4} placeholder="Mijozlarga biznesingiz haqida tabiiy va aniq ayting…" className="w-full rounded-xl border border-slate-200 p-4" /></label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold">NFCStore Business profilingiz</span>
          <input name="nfcstoreBusinessUrl" type="url" maxLength={300} placeholder="https://nfcstore.uz/..." className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-primary/25" />
          <span className="mt-2 block text-xs leading-5 text-slate-500">Majburiy emas. Tasdiqlangan NFCStore Business profilingizni ulasangiz BugunBor tarifiga 10% chegirma beriladi.</span>
        </label>
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <input required type="checkbox" name="acceptedRules" className="mt-0.5 size-4 shrink-0 rounded border-amber-300" />
        <span>Men <a href="/rules" target="_blank" className="font-bold underline underline-offset-2">BugunBor qoidalariga</a> roziman: barcha ma’lumot va narxlar rost bo‘lishi shart. Yolg‘on yoki aldovchi ma’lumot aniqlansa, profil to‘xtatiladi yoki bloklanadi.</span>
      </label>
      {state === 'error' ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <button disabled={state === 'loading'} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60">{state === 'loading' ? <LoaderCircle className="size-5 animate-spin" /> : null}{state === 'loading' ? 'Yuborilmoqda…' : 'Moderatsiyaga yuborish'}</button>
      <p className="text-center text-xs leading-5 text-slate-500">Yuborish orqali ma’lumotlar tekshirilishiga rozilik bildirasiz. Profil tasdiqlanmaguncha ochiq e’lon qilinmaydi.</p>
    </form>
  );
}
