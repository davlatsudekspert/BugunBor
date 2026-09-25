import { cn } from '@/lib/utils';

export const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-navy outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-red-400';
export const textareaClass = 'w-full rounded-xl border border-slate-200 bg-white p-4 text-navy outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-red-400';

export function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-bold text-navy">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl px-4 py-3 text-sm font-semibold', tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800')}>
      {children}
    </p>
  );
}

/** Maps zod issue paths (possibly nested under "data."/"input.") to a localized message per field. */
export function fieldMessages(fields: Record<string, string> | undefined, validation: Record<string, string>) {
  const result: Record<string, string> = {};
  for (const [path, message] of Object.entries(fields ?? {})) {
    const key = path.replace(/^(data|input)\./, '').split('.')[0];
    if (!(key in result)) result[key] = validation[message] ?? validation.invalid;
  }
  return result;
}
