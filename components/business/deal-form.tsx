'use client';

import { BadgeCheck, Clock3, LoaderCircle, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DealVisual } from '@/components/deals/deal-visual';
import { apiRequest } from '@/lib/api-client';
import type { Dictionary } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/config';
import { DEAL_VISUALS, DEAL_VISUAL_KEYS, dealVisual } from '@/lib/visuals';
import { cn } from '@/lib/utils';
import { dealInputSchema } from '@/modules/deals/schema';
import { DEAL_RULES, discountPercent } from '@/modules/deals/status';
import { Field, FormMessage, fieldMessages, inputClass, textareaClass } from './form-controls';

type Option = { id: string; name: string; slug?: string };

export type DealFormValues = {
  title: string; description: string; terms: string; categoryId: string; visual: string;
  originalPrice: string; price: string; startsAt: string; endsAt: string; quantity: string; unlimited: boolean;
  perCustomerLimit: string; claimTtlMinutes: string; branchIds: string[];
};

type Props = {
  businessId: string;
  businessName: string;
  dealId?: string;
  categories: Option[];
  branches: Option[];
  initial: DealFormValues;
  t: Pick<Dictionary, 'biz' | 'validation' | 'common' | 'errors' | 'deal'>;
};

const formatNumber = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function DealForm({ businessId, businessName, dealId, categories, branches, initial, t }: Props) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const f = t.biz.dealForm;
  const set = <K extends keyof DealFormValues>(key: K, value: DealFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const original = Number(values.originalPrice) || 0;
  const price = Number(values.price) || 0;
  const percent = original > 0 && price < original ? discountPercent(original, price) : 0;
  const category = categories.find((item) => item.id === values.categoryId);
  const visual = useMemo(() => dealVisual(values.visual, category?.slug), [values.visual, category?.slug]);

  async function save(submit: boolean) {
    const payload = {
      title: values.title,
      description: values.description,
      terms: values.terms,
      categoryId: values.categoryId,
      visual: values.visual,
      originalPrice: values.originalPrice,
      price: values.price,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      quantity: values.unlimited ? null : values.quantity,
      perCustomerLimit: values.perCustomerLimit,
      claimTtlMinutes: values.claimTtlMinutes,
      branchIds: values.branchIds,
    };
    const parsed = dealInputSchema.safeParse(payload);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] = issue.message;
      setErrors(fieldMessages(fields, { ...(t.validation as Record<string, string>), minDiscount: fmt(t.validation.minDiscount, { min: DEAL_RULES.minDiscountPercent }) }));
      setState('error');
      setMessage(t.errors.VALIDATION);
      return;
    }
    setErrors({});
    setState('saving');
    const result = await apiRequest(`/api/v1/business/${businessId}`, dealId ? { type: 'deal.update', dealId, input: parsed.data, submit } : { type: 'deal.create', input: parsed.data, submit }, { networkError: t.common.networkError });
    if (!result.ok) {
      setState('error');
      setMessage(result.message);
      setErrors(fieldMessages(result.fields, t.validation as Record<string, string>));
      return;
    }
    window.location.assign('/business/deals');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <form noValidate onSubmit={(event) => { event.preventDefault(); void save(true); }} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <Field label={f.title} error={errors.title}>
          <input value={values.title} onChange={(event) => set('title', event.target.value)} maxLength={90} placeholder={f.titlePlaceholder} aria-invalid={Boolean(errors.title)} className={inputClass} />
        </Field>
        <Field label={f.description} error={errors.description}>
          <textarea value={values.description} onChange={(event) => set('description', event.target.value)} rows={3} maxLength={600} placeholder={f.descriptionPlaceholder} aria-invalid={Boolean(errors.description)} className={textareaClass} />
        </Field>
        <Field label={f.terms} error={errors.terms}>
          <textarea value={values.terms} onChange={(event) => set('terms', event.target.value)} rows={2} maxLength={600} placeholder={f.termsPlaceholder} aria-invalid={Boolean(errors.terms)} className={textareaClass} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={f.category} error={errors.categoryId}>
            <select value={values.categoryId} onChange={(event) => set('categoryId', event.target.value)} className={inputClass}>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-bold text-navy">{f.visual}</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={f.visual}>
              {DEAL_VISUAL_KEYS.map((key) => (
                <label key={key} title={key} className={cn('grid size-10 cursor-pointer place-items-center rounded-xl border text-xl transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40', values.visual === key ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-slate-200 hover:border-primary/40')}>
                  <input type="radio" name="deal-visual" value={key} checked={values.visual === key} onChange={() => set('visual', key)} aria-label={key} className="sr-only" />
                  <span aria-hidden>{DEAL_VISUALS[key].emoji}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={`${f.originalPrice}, ${t.common.sum}`} error={errors.originalPrice}>
            <input value={values.originalPrice} onChange={(event) => set('originalPrice', event.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-invalid={Boolean(errors.originalPrice)} className={inputClass} />
          </Field>
          <Field label={`${f.price}, ${t.common.sum}`} error={errors.price} hint={percent ? fmt(f.discountPreview, { percent }) : undefined}>
            <input value={values.price} onChange={(event) => set('price', event.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-invalid={Boolean(errors.price)} className={inputClass} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={f.startsAt} hint={f.timeHint} error={errors.startsAt}>
            <input type="datetime-local" value={values.startsAt} onChange={(event) => set('startsAt', event.target.value)} aria-invalid={Boolean(errors.startsAt)} className={inputClass} />
          </Field>
          <Field label={f.endsAt} hint={f.timeHint} error={errors.endsAt}>
            <input type="datetime-local" value={values.endsAt} onChange={(event) => set('endsAt', event.target.value)} aria-invalid={Boolean(errors.endsAt)} className={inputClass} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={f.quantity} error={errors.quantity}>
            <input value={values.unlimited ? '' : values.quantity} disabled={values.unlimited} onChange={(event) => set('quantity', event.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-invalid={Boolean(errors.quantity)} className={inputClass} />
            <span className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={values.unlimited} onChange={(event) => set('unlimited', event.target.checked)} className="size-4 accent-[var(--primary)]" /> {f.unlimited}
            </span>
          </Field>
          <Field label={f.perCustomer} error={errors.perCustomerLimit}>
            <select value={values.perCustomerLimit} onChange={(event) => set('perCustomerLimit', event.target.value)} className={inputClass}>
              {Array.from({ length: DEAL_RULES.maxPerCustomer }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </Field>
          <Field label={f.ttl} error={errors.claimTtlMinutes}>
            <select value={values.claimTtlMinutes} onChange={(event) => set('claimTtlMinutes', event.target.value)} className={inputClass}>
              {DEAL_RULES.claimTtlOptions.map((minutes) => <option key={minutes} value={minutes}>{f.ttlOptions[String(minutes) as keyof typeof f.ttlOptions]}</option>)}
            </select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-navy">{f.branches}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {branches.map((branch) => {
              const checked = values.branchIds.includes(branch.id);
              return (
                <label key={branch.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold', checked ? 'border-primary bg-primary/5 text-navy' : 'border-slate-200 text-slate-600')}>
                  <input type="checkbox" checked={checked} onChange={(event) => set('branchIds', event.target.checked ? [...values.branchIds, branch.id] : values.branchIds.filter((id) => id !== branch.id))} className="size-4 accent-[var(--primary)]" />
                  {branch.name}
                </label>
              );
            })}
          </div>
          {errors.branchIds ? <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{errors.branchIds}</p> : null}
        </fieldset>

        <p className="text-xs text-slate-500">{fmt(f.rules, { min: DEAL_RULES.minDiscountPercent })}</p>
        {state === 'error' && message ? <FormMessage tone="error">{message}</FormMessage> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={state === 'saving'} onClick={() => void save(false)} className="h-12 flex-1 rounded-xl border border-slate-200 font-bold text-navy hover:border-primary/40 disabled:opacity-60">{f.saveDraft}</button>
          <button disabled={state === 'saving'} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
            {state === 'saving' ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
            {f.saveAndSubmit}
          </button>
        </div>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-xs font-black uppercase tracking-[.14em] text-slate-500">{f.preview}</p>
        <article className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(25,45,60,.08)] ring-1 ring-slate-200/70">
          <DealVisual visual={visual.key} categorySlug={category?.slug ?? ''} className="h-44 p-4">
            <span className="relative inline-flex h-8 items-center rounded-full bg-white px-3 text-base font-black text-navy shadow-sm">-{percent}%</span>
            <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-navy/90 px-3 py-2 text-xs font-bold text-white"><Clock3 className="size-3.5 text-orange-300" aria-hidden /> 04:00:00</span>
          </DealVisual>
          <div className="p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-700">{businessName} <BadgeCheck className="size-4 fill-emerald-500 text-white" aria-hidden /></p>
            <h3 className="mt-2 text-lg font-black text-navy">{values.title || f.titlePlaceholder}</h3>
            <p className="mt-2"><strong className="text-2xl font-black text-primary">{formatNumber(price)} {t.common.sum}</strong> {original ? <span className="text-sm text-slate-400 line-through">{formatNumber(original)}</span> : null}</p>
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3.5" aria-hidden /> {branches.find((branch) => values.branchIds.includes(branch.id))?.name ?? '—'}</p>
          </div>
        </article>
      </aside>
    </div>
  );
}
