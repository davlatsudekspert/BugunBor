'use client';

import { Check, LoaderCircle, X } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const ADMIN_API = '/api/v1/admin';
const small = 'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-50';

async function post(payload: Record<string, unknown>, networkError: string) {
  return apiRequest<Record<string, unknown>>(ADMIN_API, payload, { networkError });
}

function ErrorLine({ text }: { text: string }) {
  return text ? <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{text}</p> : null;
}

export function DecisionForm({ kind, targetId, labels }: {
  kind: 'deal' | 'business';
  targetId: string;
  labels: { approve: string; reject: string; reason: string; placeholder: string; hint: string; networkError: string };
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [error, setError] = useState('');
  async function decide(decision: 'APPROVE' | 'REJECT') {
    setBusy(decision);
    setError('');
    const payload = kind === 'deal' ? { type: 'deal.decide', dealId: targetId, decision, reason } : { type: 'business.decide', businessId: targetId, decision, reason };
    const result = await post(payload, labels.networkError);
    setBusy(null);
    if (!result.ok) setError(result.message);
    else window.location.reload();
  }
  return (
    <div className="mt-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{labels.reason}</span>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} maxLength={800} placeholder={labels.placeholder} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <p className="mt-1 text-xs text-slate-500">{labels.hint}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy !== null} onClick={() => decide('APPROVE')} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-50">
          {busy === 'APPROVE' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} {labels.approve}
        </button>
        <button type="button" disabled={busy !== null || reason.trim().length < 10} onClick={() => decide('REJECT')} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 text-sm font-bold text-red-700 disabled:opacity-50">
          {busy === 'REJECT' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />} {labels.reject}
        </button>
      </div>
      <ErrorLine text={error} />
    </div>
  );
}

/** One-click admin action; optionally asks for confirmation or a reason first. */
export function ActionButton({ payload, label, confirmText, reasonPrompt, tone = 'neutral', networkError }: {
  payload: Record<string, unknown>;
  label: string;
  confirmText?: string;
  reasonPrompt?: string;
  tone?: 'neutral' | 'danger' | 'success';
  networkError: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          let body = payload;
          if (reasonPrompt) {
            const reason = window.prompt(reasonPrompt);
            if (reason === null) return;
            body = { ...payload, reason };
          } else if (confirmText && !window.confirm(confirmText)) {
            return;
          }
          setBusy(true);
          setError('');
          const result = await post(body, networkError);
          setBusy(false);
          if (!result.ok) setError(result.message);
          else window.location.reload();
        }}
        className={cn(small, tone === 'danger' ? 'border-red-200 text-red-700 hover:bg-red-50' : tone === 'success' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-slate-200 text-navy hover:border-primary/40')}
      >
        {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null} {label}
      </button>
      <ErrorLine text={error} />
    </span>
  );
}

export function UserControls({ userId, role, status, labels }: {
  userId: string;
  role: string;
  status: string;
  labels: { roles: Record<string, string>; setRole: string; block: string; unblock: string; networkError: string };
}) {
  const [value, setValue] = useState(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    const result = await post({ type: 'user.update', userId, ...payload }, labels.networkError);
    setBusy(false);
    if (!result.ok) setError(result.message);
    else window.location.reload();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={value} onChange={(event) => setValue(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-navy" aria-label={labels.setRole}>
        {Object.entries(labels.roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <button type="button" disabled={busy || value === role} onClick={() => send({ role: value })} className={cn(small, 'border-slate-200 text-navy')}>{labels.setRole}</button>
      <button type="button" disabled={busy} onClick={() => send({ status: status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED' })} className={cn(small, status === 'BLOCKED' ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700')}>
        {status === 'BLOCKED' ? labels.unblock : labels.block}
      </button>
      <ErrorLine text={error} />
    </div>
  );
}

type CategoryValue = { id: string | null; slug: string; nameUz: string; nameRu: string; icon: string; sortOrder: number; isActive: boolean };

export function CategoryForm({ value, icons, labels }: {
  value: CategoryValue;
  icons: string[];
  labels: { slug: string; nameUz: string; nameRu: string; icon: string; order: string; active: string; save: string; networkError: string };
}) {
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm';
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        const result = await post({ type: 'category.save', ...form, sortOrder: Number(form.sortOrder) }, labels.networkError);
        setBusy(false);
        if (!result.ok) setError(result.message);
        else window.location.reload();
      }}
      className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_.8fr_.5fr_auto_auto] sm:items-end"
    >
      <label className="text-xs font-bold text-slate-500">{labels.slug}<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase() })} disabled={Boolean(value.id)} className={input} /></label>
      <label className="text-xs font-bold text-slate-500">{labels.nameUz}<input value={form.nameUz} onChange={(event) => setForm({ ...form, nameUz: event.target.value })} className={input} /></label>
      <label className="text-xs font-bold text-slate-500">{labels.nameRu}<input value={form.nameRu} onChange={(event) => setForm({ ...form, nameRu: event.target.value })} className={input} /></label>
      <label className="text-xs font-bold text-slate-500">{labels.icon}
        <select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} className={input}>
          {icons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-slate-500">{labels.order}<input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} className={input} /></label>
      <label className="flex h-10 items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> {labels.active}</label>
      <button disabled={busy} className="h-10 rounded-lg bg-navy px-4 text-xs font-bold text-white disabled:opacity-50">{labels.save}</button>
      {error ? <p role="alert" className="text-xs font-semibold text-red-600 sm:col-span-7">{error}</p> : null}
    </form>
  );
}

type PlanValue = { code: string; name: string; priceMonthlyUzs: number; maxBranches: number | null; maxLiveDeals: number | null; maxStaff: number | null; topSlots: number; isActive: boolean };

export function PlanForm({ value, labels }: {
  value: PlanValue;
  labels: { price: string; maxBranches: string; maxDeals: string; maxStaff: string; topSlots: string; active: string; unlimitedHint: string; save: string; saved: string; networkError: string };
}) {
  const [form, setForm] = useState({ ...value, maxBranches: value.maxBranches?.toString() ?? '', maxLiveDeals: value.maxLiveDeals?.toString() ?? '', maxStaff: value.maxStaff?.toString() ?? '' });
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const input = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm';
  const toLimit = (raw: string) => (raw.trim() === '' ? null : Number(raw));
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setState('busy');
        const result = await post({
          type: 'plan.update',
          code: value.code,
          priceMonthlyUzs: Number(form.priceMonthlyUzs),
          maxBranches: toLimit(form.maxBranches),
          maxLiveDeals: toLimit(form.maxLiveDeals),
          maxStaff: toLimit(form.maxStaff),
          topSlots: Number(form.topSlots),
          isActive: form.isActive,
        }, labels.networkError);
        if (!result.ok) {
          setState('error');
          setError(result.message);
        } else setState('saved');
      }}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <p className="font-black text-navy">{value.name} <span className="text-xs font-semibold text-slate-400">{value.code}</span></p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="col-span-2 text-xs font-bold text-slate-500">{labels.price}<input type="number" min={0} value={form.priceMonthlyUzs} onChange={(event) => setForm({ ...form, priceMonthlyUzs: Number(event.target.value) })} className={input} /></label>
        <label className="text-xs font-bold text-slate-500">{labels.maxBranches}<input value={form.maxBranches} inputMode="numeric" onChange={(event) => setForm({ ...form, maxBranches: event.target.value.replace(/\D/g, '') })} className={input} /></label>
        <label className="text-xs font-bold text-slate-500">{labels.maxDeals}<input value={form.maxLiveDeals} inputMode="numeric" onChange={(event) => setForm({ ...form, maxLiveDeals: event.target.value.replace(/\D/g, '') })} className={input} /></label>
        <label className="text-xs font-bold text-slate-500">{labels.maxStaff}<input value={form.maxStaff} inputMode="numeric" onChange={(event) => setForm({ ...form, maxStaff: event.target.value.replace(/\D/g, '') })} className={input} /></label>
        <label className="text-xs font-bold text-slate-500">{labels.topSlots}<input type="number" min={0} value={form.topSlots} onChange={(event) => setForm({ ...form, topSlots: Number(event.target.value) })} className={input} /></label>
      </div>
      <p className="mt-1 text-xs text-slate-400">{labels.unlimitedHint}</p>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> {labels.active}</label>
        <button disabled={state === 'busy'} className="h-9 rounded-lg bg-navy px-4 text-xs font-bold text-white disabled:opacity-50">{state === 'saved' ? labels.saved : labels.save}</button>
      </div>
      <ErrorLine text={state === 'error' ? error : ''} />
    </form>
  );
}

export function SettingsForm({ value, plans, labels }: {
  value: { trialMonths: number; trialPlan: string; paymentInstructionsUz: string; paymentInstructionsRu: string };
  plans: Array<{ code: string; name: string }>;
  labels: { trialMonths: string; trialPlan: string; instructionsUz: string; instructionsRu: string; months: string; save: string; saved: string; networkError: string };
}) {
  const [form, setForm] = useState(value);
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 text-sm';
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setState('busy');
        const result = await post({ type: 'settings.update', ...form }, labels.networkError);
        if (!result.ok) {
          setState('error');
          setError(result.message);
        } else setState('saved');
      }}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    >
      <label className="text-sm font-bold text-navy">{labels.trialMonths}
        <select value={form.trialMonths} onChange={(event) => setForm({ ...form, trialMonths: Number(event.target.value) })} className={cn(input, 'mt-1.5 h-11')}>
          {[1, 2, 3].map((months) => <option key={months} value={months}>{labels.months.replace('{count}', String(months))}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-navy">{labels.trialPlan}
        <select value={form.trialPlan} onChange={(event) => setForm({ ...form, trialPlan: event.target.value })} className={cn(input, 'mt-1.5 h-11')}>
          {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-navy">{labels.instructionsUz}
        <textarea value={form.paymentInstructionsUz} onChange={(event) => setForm({ ...form, paymentInstructionsUz: event.target.value })} rows={4} maxLength={2000} className={cn(input, 'mt-1.5 p-3')} />
      </label>
      <label className="text-sm font-bold text-navy">{labels.instructionsRu}
        <textarea value={form.paymentInstructionsRu} onChange={(event) => setForm({ ...form, paymentInstructionsRu: event.target.value })} rows={4} maxLength={2000} className={cn(input, 'mt-1.5 p-3')} />
      </label>
      <div className="sm:col-span-2">
        <button disabled={state === 'busy'} className="h-11 rounded-xl bg-navy px-6 text-sm font-bold text-white disabled:opacity-50">{state === 'saved' ? labels.saved : labels.save}</button>
        <ErrorLine text={state === 'error' ? error : ''} />
      </div>
    </form>
  );
}
