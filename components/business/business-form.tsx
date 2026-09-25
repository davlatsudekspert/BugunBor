'use client';

import { CheckCircle2, LoaderCircle, LocateFixed } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { CITIES } from '@/lib/cities';
import type { Dictionary } from '@/lib/i18n';
import { businessProfileSchema, onboardingSchema } from '@/modules/businesses/schema';
import { Field, FormMessage, fieldMessages, inputClass, textareaClass } from './form-controls';
import { PhotoPicker } from './photo-picker';

type Category = { id: string; name: string };

type Initial = {
  name?: string; description?: string; categoryId?: string; city?: string; phone?: string;
  telegram?: string | null; instagram?: string | null; website?: string | null; logoId?: string | null; coverId?: string | null;
};

type Props = {
  mode: 'create' | 'edit';
  businessId?: string;
  canResubmit?: boolean;
  categories: Category[];
  initial: Initial;
  locale: 'uz' | 'ru';
  t: Pick<Dictionary, 'businessForm' | 'validation' | 'onboarding' | 'common' | 'biz' | 'errors'>;
};

export function BusinessForm({ mode, businessId, canResubmit, categories, initial, locale, t }: Props) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [logoId, setLogoId] = useState(initial.logoId ?? null);
  const [coverId, setCoverId] = useState(initial.coverId ?? null);

  async function submit(form: HTMLFormElement, resubmit: boolean) {
    const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const images = mode === 'edit' ? { logoId, coverId } : {};
    const data = { ...values, ...images, latitude: point?.latitude ?? null, longitude: point?.longitude ?? null };
    const parsed = (mode === 'create' ? onboardingSchema : businessProfileSchema).safeParse(data);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors(fieldMessages(fields, t.validation as Record<string, string>));
      setState('error');
      setMessage(t.errors.VALIDATION);
      return;
    }
    setErrors({});
    setState('saving');
    const result =
      mode === 'create'
        ? await apiRequest<{ id: string }>('/api/v1/businesses', parsed.data, { networkError: t.common.networkError })
        : await apiRequest(`/api/v1/business/${businessId}`, { type: 'profile.update', data: parsed.data, resubmit }, { networkError: t.common.networkError });
    if (!result.ok) {
      setState('error');
      setMessage(result.message);
      setErrors(fieldMessages(result.fields, t.validation as Record<string, string>));
      return;
    }
    if (mode === 'create') {
      setState('saved');
      const created = result.data as { id: string };
      window.location.assign(`/business/switch/${created.id}?next=${encodeURIComponent('/business/dashboard')}`);
      return;
    }
    setState('saved');
    setMessage(t.common.saved);
    if (resubmit) window.location.reload();
  }

  function locate() {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({ latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)) });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  const f = t.businessForm;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget, false);
      }}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(20,40,55,.06)] sm:p-8"
    >
      {mode === 'edit' && businessId ? (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <PhotoPicker businessId={businessId} kind="LOGO" value={logoId} onChange={setLogoId} label={t.biz.photo.logo} hint={t.biz.photo.logoHint} labels={{ ...t.biz.photo, networkError: t.common.networkError }} />
          <PhotoPicker businessId={businessId} kind="COVER" value={coverId} onChange={setCoverId} label={t.biz.photo.cover} hint={t.biz.photo.coverHint} labels={{ ...t.biz.photo, networkError: t.common.networkError }} />
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f.name} error={errors.name} className="sm:col-span-2">
          <input name="name" defaultValue={initial.name} maxLength={80} placeholder={f.namePlaceholder} aria-invalid={Boolean(errors.name)} className={inputClass} />
        </Field>
        <Field label={f.category} error={errors.categoryId}>
          <select name="categoryId" defaultValue={initial.categoryId ?? categories[0]?.id} className={inputClass}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <Field label={f.city} error={errors.city}>
          <select name="city" defaultValue={initial.city ?? 'tashkent'} className={inputClass}>
            {CITIES.map((city) => <option key={city.slug} value={city.slug}>{locale === 'ru' ? city.ru : city.uz}</option>)}
          </select>
        </Field>
        <Field label={f.phone} hint={f.phoneHint} error={errors.phone}>
          <input name="phone" type="tel" inputMode="tel" defaultValue={initial.phone ?? '+998'} maxLength={20} aria-invalid={Boolean(errors.phone)} className={inputClass} />
        </Field>
        {mode === 'create' ? (
          <Field label={f.address} error={errors.address}>
            <input name="address" maxLength={240} placeholder={f.addressPlaceholder} aria-invalid={Boolean(errors.address)} className={inputClass} />
          </Field>
        ) : (
          <Field label={f.telegram} error={errors.telegram}>
            <input name="telegram" defaultValue={initial.telegram ?? ''} placeholder={f.telegramPlaceholder} className={inputClass} />
          </Field>
        )}
        <Field label={f.description} error={errors.description} className="sm:col-span-2">
          <textarea name="description" defaultValue={initial.description} rows={4} maxLength={1200} placeholder={f.descriptionPlaceholder} aria-invalid={Boolean(errors.description)} className={textareaClass} />
        </Field>
        {mode === 'create' ? (
          <Field label={f.telegram} hint={t.common.optional} error={errors.telegram}>
            <input name="telegram" placeholder={f.telegramPlaceholder} className={inputClass} />
          </Field>
        ) : null}
        <Field label={f.instagram} hint={t.common.optional} error={errors.instagram}>
          <input name="instagram" defaultValue={initial.instagram ?? ''} placeholder={f.instagramPlaceholder} className={inputClass} />
        </Field>
        <Field label={f.website} hint={t.common.optional} error={errors.website} className={mode === 'edit' ? 'sm:col-span-2' : undefined}>
          <input name="website" type="url" defaultValue={initial.website ?? ''} placeholder={f.websitePlaceholder} className={inputClass} />
        </Field>
        {mode === 'create' ? (
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-bold text-navy">{t.biz.branches.location}</span>
            <button type="button" onClick={locate} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-navy hover:border-primary/40">
              {locating ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4 text-primary" aria-hidden />} {t.biz.branches.useMyLocation}
            </button>
            <p className="mt-1.5 text-xs text-slate-500">
              {point ? t.biz.branches.locationSet.replace('{lat}', String(point.latitude)).replace('{lon}', String(point.longitude)) : t.biz.branches.locationCity}
            </p>
          </div>
        ) : null}
      </div>
      {state === 'error' && message ? <FormMessage tone="error">{message}</FormMessage> : null}
      {state === 'saved' && mode === 'edit' ? <FormMessage tone="success"><CheckCircle2 className="mr-1 inline size-4" aria-hidden />{message}</FormMessage> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button disabled={state === 'saving'} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60">
          {state === 'saving' ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
          {mode === 'create' ? (state === 'saving' ? t.onboarding.submitting : t.onboarding.submit) : t.common.save}
        </button>
        {mode === 'edit' && canResubmit ? (
          <button
            type="button"
            disabled={state === 'saving'}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) void submit(form, true);
            }}
            className="h-12 flex-1 rounded-xl bg-navy px-6 font-bold text-white disabled:opacity-60"
          >
            {t.biz.profile.resubmit}
          </button>
        ) : null}
      </div>
      {mode === 'create' ? <p className="text-center text-xs leading-5 text-slate-500">{t.onboarding.consent}</p> : null}
    </form>
  );
}
