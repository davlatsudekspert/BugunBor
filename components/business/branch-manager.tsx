'use client';

import { LoaderCircle, LocateFixed, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { CITIES } from '@/lib/cities';
import type { Dictionary } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/config';
import { branchSchema } from '@/modules/businesses/schema';
import { Field, FormMessage, fieldMessages, inputClass } from './form-controls';

export type BranchItem = { id: string; name: string; city: string; address: string; phone: string | null; open: string; close: string; latitude: number; longitude: number; activeDeals: number };

type T = Pick<Dictionary, 'biz' | 'validation' | 'common' | 'errors'>;

function BranchEditor({ businessId, branch, locale, t, onDone }: { businessId: string; branch?: BranchItem; locale: 'uz' | 'ru'; t: T; onDone: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const b = t.biz.branches;

  async function save(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form).entries());
    const parsed = branchSchema.safeParse({ ...values, latitude: point?.latitude ?? null, longitude: point?.longitude ?? null });
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors(fieldMessages(fields, t.validation as Record<string, string>));
      return;
    }
    setSaving(true);
    const result = await apiRequest(`/api/v1/business/${businessId}`, branch ? { type: 'branch.update', branchId: branch.id, data: parsed.data } : { type: 'branch.create', data: parsed.data }, { networkError: t.common.networkError });
    setSaving(false);
    if (!result.ok) {
      setMessage(result.message);
      setErrors(fieldMessages(result.fields, t.validation as Record<string, string>));
      return;
    }
    onDone();
  }

  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }} className="grid gap-4 rounded-2xl border border-primary/30 bg-white p-5 sm:grid-cols-2">
      <Field label={b.name} error={errors.name}><input name="name" defaultValue={branch?.name} placeholder={b.namePlaceholder} className={inputClass} /></Field>
      <Field label={b.city} error={errors.city}>
        <select name="city" defaultValue={branch?.city ?? 'tashkent'} className={inputClass}>
          {CITIES.map((city) => <option key={city.slug} value={city.slug}>{locale === 'ru' ? city.ru : city.uz}</option>)}
        </select>
      </Field>
      <Field label={b.address} error={errors.address} className="sm:col-span-2"><input name="address" defaultValue={branch?.address} className={inputClass} /></Field>
      <Field label={b.phone} hint={t.common.optional} error={errors.phone}><input name="phone" type="tel" defaultValue={branch?.phone ?? ''} placeholder="+998" className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={b.open} error={errors.open}><input name="open" type="time" defaultValue={branch?.open ?? '09:00'} className={inputClass} /></Field>
        <Field label={b.close} error={errors.close}><input name="close" type="time" defaultValue={branch?.close ?? '21:00'} className={inputClass} /></Field>
      </div>
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => navigator.geolocation?.getCurrentPosition((position) => setPoint({ latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)) }))}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-navy hover:border-primary/40"
        >
          <LocateFixed className="size-4 text-primary" aria-hidden /> {b.useMyLocation}
        </button>
        <p className="mt-1.5 text-xs text-slate-500">
          {point ? fmt(b.locationSet, { lat: point.latitude, lon: point.longitude }) : branch ? fmt(b.locationSet, { lat: branch.latitude.toFixed(4), lon: branch.longitude.toFixed(4) }) : b.locationCity}
        </p>
      </div>
      {message ? <div className="sm:col-span-2"><FormMessage tone="error">{message}</FormMessage></div> : null}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
          {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} {b.saveBranch}
        </button>
        <button type="button" onClick={onDone} className="h-11 rounded-xl border border-slate-200 px-5 font-bold text-navy">{t.common.cancel}</button>
      </div>
    </form>
  );
}

export function BranchManager({ businessId, branches, locale, cityNames, t }: { businessId: string; branches: BranchItem[]; locale: 'uz' | 'ru'; cityNames: Record<string, string>; t: T }) {
  const [editing, setEditing] = useState<string | null>(null) // branch id, or 'new' for the create form;
  const [error, setError] = useState('');
  const reload = () => window.location.reload();

  async function remove(branch: BranchItem) {
    if (!window.confirm(`${t.common.delete}: ${branch.name}?`)) return;
    const result = await apiRequest(`/api/v1/business/${businessId}`, { type: 'branch.delete', branchId: branch.id }, { networkError: t.common.networkError });
    if (!result.ok) setError(result.message);
    else reload();
  }

  return (
    <div className="space-y-3">
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {branches.map((branch) =>
        editing === branch.id ? (
          <BranchEditor key={branch.id} businessId={businessId} branch={branch} locale={locale} t={t} onDone={reload} />
        ) : (
          <div key={branch.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-bold text-navy"><MapPin className="size-4 text-primary" aria-hidden /> {branch.name}</p>
              <p className="mt-1 text-sm text-slate-500">{branch.address}, {cityNames[branch.city] ?? branch.city}</p>
              <p className="mt-1 text-sm text-slate-500">{t.biz.branches.open}–{t.biz.branches.close}: {branch.open}–{branch.close}{branch.phone ? ` · ${branch.phone}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(branch.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-navy"><Pencil className="size-3.5" aria-hidden /> {t.common.edit}</button>
              <button type="button" onClick={() => void remove(branch)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-red-600"><Trash2 className="size-3.5" aria-hidden /> {t.common.delete}</button>
            </div>
          </div>
        ),
      )}
      {editing === 'new' ? (
        <BranchEditor businessId={businessId} locale={locale} t={t} onDone={reload} />
      ) : (
        <button type="button" onClick={() => setEditing('new')} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 font-bold text-slate-600 hover:border-primary hover:text-primary">
          <Plus className="size-5" aria-hidden /> {t.biz.branches.add}
        </button>
      )}
    </div>
  );
}
