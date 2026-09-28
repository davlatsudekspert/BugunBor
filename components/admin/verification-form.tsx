'use client';

import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiRequest } from '@/lib/api-client';

type Codes = { google: string; yandex: string };
type Labels = { google: string; yandex: string; hint: string; save: string; saved: string; networkError: string };

const input = 'h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm text-navy outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20';

/** The codes Google Search Console and Yandex Webmaster give; the home page carries them. */
export function VerificationForm({ initial, labels }: { initial: Codes; labels: Labels }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const field = (key: keyof Codes, label: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
      <input
        value={values[key]}
        onChange={(event) => { setValues({ ...values, [key]: event.target.value }); setState('idle'); }}
        maxLength={400}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        className={input}
      />
    </label>
  );
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setState('saving');
        setError('');
        const result = await apiRequest<Codes>('/api/v1/admin', { type: 'seo.verification', ...values }, { networkError: labels.networkError });
        if (!result.ok) {
          setState('error');
          setError(result.message);
          return;
        }
        // A pasted <meta …> tag comes back as the code alone.
        setValues(result.data);
        setState('saved');
        router.refresh();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {field('google', labels.google)}
        {field('yandex', labels.yandex)}
      </div>
      <p className="text-xs leading-5 text-slate-500">{labels.hint}</p>
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
