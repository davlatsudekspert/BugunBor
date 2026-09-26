'use client';

import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';

type Company = { legalName: string; tin: string; registration: string; address: string; phone: string; email: string };
type Labels = { legalName: string; tin: string; tinHint: string; registration: string; registrationHint: string; address: string; addressHint: string; phone: string; email: string; save: string; saved: string; networkError: string };

const input = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-navy outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20';

/** The operator's legal details for the footer, the contact page and the public offer. */
export function CompanyForm({ initial, labels }: { initial: Company; labels: Labels }) {
  const [values, setValues] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const field = (key: keyof Company, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
      <input value={values[key]} onChange={(event) => { setValues({ ...values, [key]: event.target.value }); setState('idle'); }} className={input} {...extra} />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setState('saving');
        setError('');
        const result = await apiRequest('/api/v1/admin', { type: 'company.update', ...values }, { networkError: labels.networkError });
        if (!result.ok) {
          setState('error');
          setError(result.message);
          return;
        }
        setState('saved');
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {field('legalName', labels.legalName, { maxLength: 160 })}
        {field('tin', labels.tin, { inputMode: 'numeric', maxLength: 9, pattern: '\\d{9}' }, labels.tinHint)}
        {field('registration', labels.registration, { maxLength: 120 }, labels.registrationHint)}
        {field('address', labels.address, { maxLength: 240 }, labels.addressHint)}
        {field('phone', labels.phone, { type: 'tel', inputMode: 'tel', maxLength: 20, placeholder: '+998' })}
        {field('email', labels.email, { type: 'email', maxLength: 120 })}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={state === 'saving'} className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-bold text-white disabled:opacity-60">
          {state === 'saving' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} {labels.save}
        </button>
        {state === 'saved' ? <output className="flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" aria-hidden /> {labels.saved}</output> : null}
        {state === 'error' ? <span role="alert" className="text-sm font-semibold text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
