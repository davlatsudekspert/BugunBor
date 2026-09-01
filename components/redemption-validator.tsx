'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, Keyboard, LoaderCircle, ScanLine, XCircle } from 'lucide-react';

import { QrScanner } from '@/components/qr-scanner';

type ValidateResponse = { data?: { dealTitle: string; branchName: string }; error?: { message: string } };

export function RedemptionValidator() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const validate = useCallback(async (value: string) => {
    setState('loading');
    setMessage('');
    const response = await fetch('/api/v1/business/redemptions/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: value }),
    });
    const result = (await response.json()) as ValidateResponse;
    if (!response.ok) {
      setState('error');
      setMessage(result.error?.message ?? 'Kod tasdiqlanmadi.');
      return;
    }
    setState('success');
    setMessage(`${result.data!.dealTitle} — ${result.data!.branchName}`);
    setCode('');
  }, []);

  async function submit(formData: FormData) {
    const raw = formData.get('code');
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return;
    await validate(value);
  }

  const handleScan = useCallback((value: string) => {
    setScannerOpen(false);
    void validate(value.trim());
  }, [validate]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(20,40,55,.08)] sm:p-8">
      {scannerOpen ? (
        <div className="mb-5"><QrScanner onDetect={handleScan} onClose={() => setScannerOpen(false)} /></div>
      ) : (
        <button type="button" onClick={() => setScannerOpen(true)} className="mb-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 text-sm font-bold text-primary hover:bg-primary/5">
          <ScanLine className="size-5" /> Kamera bilan skanerlash
        </button>
      )}

      <form action={submit}>
        <label className="block">
          <span className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Keyboard className="size-4" /> Yoki kodni qo‘lda kiriting</span>
          <input
            required
            name="code"
            value={code}
            onChange={(event) => { setCode(event.target.value); setState('idle'); }}
            placeholder="Mijoz ko‘rsatgan kodni kiriting"
            className="h-14 w-full rounded-xl border border-slate-200 px-4 text-center font-mono text-lg tracking-wide outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>

        {state === 'success' ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /> Tasdiqlandi: {message}</p>
        ) : state === 'error' ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><XCircle className="mt-0.5 size-5 shrink-0" /> {message}</p>
        ) : null}

        <button disabled={state === 'loading' || !code.trim()} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60">
          {state === 'loading' ? <LoaderCircle className="size-5 animate-spin" /> : <ScanLine className="size-5" />}
          {state === 'loading' ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
        </button>
      </form>
    </div>
  );
}
