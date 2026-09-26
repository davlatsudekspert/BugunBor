'use client';

import { CheckCircle2, ChevronDown, LoaderCircle, LocateFixed, Send, Wand2 } from 'lucide-react';
import { useState } from 'react';

import { CategoryIcon, categoryColor } from '@/components/deals/category-icon';
import { apiRequest } from '@/lib/api-client';
import { CITIES, nearestCity } from '@/lib/cities';
import type { Dictionary } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { businessProfileSchema, onboardingSchema } from '@/modules/businesses/schema';
import { Field, FormMessage, fieldMessages, inputClass, textareaClass } from './form-controls';
import { PhotoPicker } from './photo-picker';

type Category = { id: string; name: string; slug: string; icon: string | null };

type Initial = {
  name?: string; description?: string; categoryId?: string; city?: string; phone?: string;
  telegram?: string | null; instagram?: string | null; website?: string | null; logoId?: string | null; coverId?: string | null;
};

type Props = {
  mode: 'create' | 'edit';
  businessId?: string;
  canResubmit?: boolean;
  /** The business is waiting for review: saving checks it again, so the page reloads to show the result. */
  pending?: boolean;
  categories: Category[];
  initial: Initial;
  /** The owner's own Telegram username, offered as the contact with one tap. */
  telegramUsername?: string | null;
  locale: 'uz' | 'ru';
  t: Pick<Dictionary, 'businessForm' | 'validation' | 'onboarding' | 'common' | 'biz' | 'errors'>;
};

const MAX_DESCRIPTION = 1200;
const MIN_DESCRIPTION = 20;

export function BusinessForm({ mode, businessId, canResubmit, pending, categories, initial, telegramUsername, locale, t }: Props) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(initial.name ?? '');
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? categories[0]?.id ?? '');
  const [city, setCity] = useState(initial.city ?? 'tashkent');
  const [description, setDescription] = useState(initial.description ?? '');
  const [telegram, setTelegram] = useState(initial.telegram ?? '');
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState<'idle' | 'busy' | 'failed'>('idle');
  const [logoId, setLogoId] = useState(initial.logoId ?? null);
  const [coverId, setCoverId] = useState(initial.coverId ?? null);
  const f = t.businessForm;
  const cityLabel = (slug: string) => {
    const found = CITIES.find((item) => item.slug === slug);
    return found ? (locale === 'ru' ? found.ru : found.uz) : slug;
  };

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
    if (resubmit || pending) window.location.reload();
  }

  // The nearest city is picked from the location, so most owners never touch the list.
  function locate() {
    if (!('geolocation' in navigator)) {
      setLocating('failed');
      return;
    }
    setLocating('busy');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const found = { latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)) };
        setPoint(found);
        setCity(nearestCity(found).slug);
        setLocating('idle');
      },
      () => setLocating('failed'),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function applyTemplate() {
    const slug = categories.find((category) => category.id === categoryId)?.slug ?? '';
    const template = (f.templates[slug] ?? f.templates.default).replace('{name}', name.trim() || (locale === 'ru' ? 'Мы' : 'Biz'));
    if (description.trim() && description.trim() !== template && !window.confirm(f.templateReplace)) return;
    setDescription(template);
  }

  const hasExtras = Boolean(initial.telegram || initial.instagram || initial.website);
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

      <Field label={f.name} error={errors.name}>
        <input name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={f.namePlaceholder} aria-invalid={Boolean(errors.name)} className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-bold text-navy">{f.category}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {categories.map((category) => (
            <label
              key={category.id}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40',
                categoryId === category.id ? 'border-primary bg-primary/5 text-navy' : 'border-slate-200 text-slate-600 hover:border-primary/40',
              )}
            >
              <input type="radio" name="categoryId" value={category.id} checked={categoryId === category.id} onChange={() => setCategoryId(category.id)} className="sr-only" />
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', categoryColor(category.slug))}><CategoryIcon icon={category.icon} className="size-4" /></span>
              <span className="min-w-0 leading-tight">{category.name}</span>
            </label>
          ))}
        </div>
        {errors.categoryId ? <span role="alert" className="mt-1.5 block text-xs font-semibold text-red-600">{errors.categoryId}</span> : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f.city} error={errors.city}>
          <select name="city" value={city} onChange={(event) => setCity(event.target.value)} className={inputClass}>
            {CITIES.map((item) => <option key={item.slug} value={item.slug}>{locale === 'ru' ? item.ru : item.uz}</option>)}
          </select>
        </Field>
        <Field label={f.phone} hint={f.phoneHint} error={errors.phone}>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={initial.phone ?? '+998'} maxLength={20} aria-invalid={Boolean(errors.phone)} className={inputClass} />
        </Field>
      </div>

      {mode === 'create' ? (
        <>
          <div>
            <button type="button" onClick={locate} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-navy hover:border-primary/40">
              {locating === 'busy' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4 text-primary" aria-hidden />} {f.locate}
            </button>
            <p className={cn('mt-1.5 text-xs', locating === 'failed' ? 'font-semibold text-amber-700' : 'text-slate-500')} aria-live="polite">
              {point ? fmt(f.located, { city: cityLabel(city) }) : locating === 'failed' ? f.locateFailed : t.biz.branches.locationCity}
            </p>
          </div>
          <Field label={f.address} hint={f.addressHint} error={errors.address}>
            <input name="address" maxLength={240} autoComplete="street-address" placeholder={f.addressPlaceholder} aria-invalid={Boolean(errors.address)} className={inputClass} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-bold text-navy">{f.hours}</legend>
            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <Field label={t.biz.branches.open} error={errors.open}><input name="open" type="time" defaultValue="09:00" className={inputClass} /></Field>
              <Field label={t.biz.branches.close} error={errors.close}><input name="close" type="time" defaultValue="21:00" className={inputClass} /></Field>
            </div>
          </fieldset>
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <a href="/business/branches" className="font-bold text-primary underline-offset-2 hover:underline">{t.biz.nav.branches}</a> — {f.branchesNote}
        </p>
      )}

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="business-description" className="text-sm font-bold text-navy">{f.description}</label>
          <button type="button" onClick={applyTemplate} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-primary hover:border-primary/40">
            <Wand2 className="size-3.5" aria-hidden /> {f.template}
          </button>
        </div>
        <textarea
          id="business-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={MAX_DESCRIPTION}
          placeholder={f.descriptionPlaceholder}
          aria-invalid={Boolean(errors.description)}
          className={textareaClass}
        />
        <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
          {errors.description ? <span role="alert" className="font-semibold text-red-600">{errors.description}</span> : <span className="text-slate-500">{f.templateHint}</span>}
          <span className={cn('shrink-0 tabular-nums', description.trim().length < MIN_DESCRIPTION ? 'font-semibold text-amber-700' : 'text-slate-400')}>
            {fmt(f.counter, { count: description.trim().length, max: MAX_DESCRIPTION })}
          </span>
        </div>
      </div>

      <details className="group rounded-2xl border border-slate-200 p-4" open={mode === 'edit' && hasExtras}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-navy">
          {f.more} <ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label={f.telegram} error={errors.telegram}>
            <input name="telegram" value={telegram} onChange={(event) => setTelegram(event.target.value)} placeholder={f.telegramPlaceholder} className={inputClass} />
            {telegramUsername && !telegram ? (
              <button type="button" onClick={() => setTelegram(telegramUsername)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-sky-50 px-3 text-xs font-bold text-sky-700">
                <Send className="size-3.5" aria-hidden /> {fmt(f.myTelegram, { username: telegramUsername })}
              </button>
            ) : null}
          </Field>
          <Field label={f.instagram} error={errors.instagram}>
            <input name="instagram" defaultValue={initial.instagram ?? ''} placeholder={f.instagramPlaceholder} className={inputClass} />
          </Field>
          <Field label={f.website} error={errors.website} className="sm:col-span-2">
            <input name="website" type="url" defaultValue={initial.website ?? ''} placeholder={f.websitePlaceholder} className={inputClass} />
          </Field>
        </div>
      </details>

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
