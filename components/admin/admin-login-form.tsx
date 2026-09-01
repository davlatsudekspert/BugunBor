'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LockKeyhole, RotateCcw, Send } from 'lucide-react';

type Step = 'phone' | 'code';

export function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+998');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // A synchronous re-entry guard — see components/customer-login-form.tsx's own comment on
  // why `busy` state alone doesn't stop a double-tap from firing a second /request-otp call
  // that silently supersedes the code already on the way.
  const inFlightRef = useRef(false);

  async function requestCode(formData: FormData) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const rawPhone = formData.get('phone');
    const submittedPhone = typeof rawPhone === 'string' ? rawPhone : '';
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/auth/request-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: submittedPhone }),
      });
      const result = (await response.json()) as { data?: { message: string }; error?: { message: string } };
      if (!response.ok) { setError(result.error?.message ?? 'So‘rov bajarilmadi.'); return; }
      setPhone(submittedPhone);
      setNotice(result.data?.message ?? 'Kod Telegram orqali yuborildi.');
      setStep('code');
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  }

  async function verifyCode(formData: FormData) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const rawCode = formData.get('code');
    const code = typeof rawCode === 'string' ? rawCode : '';
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const result = (await response.json()) as { data?: { role: string }; error?: { message: string } };
      if (!response.ok) { setError(result.error?.message ?? 'Kod noto‘g‘ri yoki eskirgan.'); return; }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  }

  async function resendCode() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/admin/auth/request-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const result = (await response.json()) as { data?: { message: string }; error?: { message: string } };
      if (!response.ok) { setError(result.error?.message ?? 'So‘rov bajarilmadi.'); return; }
      setNotice(result.data?.message ?? 'Kod Telegram orqali yuborildi.');
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  }

  if (step === 'code') {
    return (
      <form action={verifyCode} className="space-y-4">
        {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Telegram’dagi 6 xonali kod</span>
          <input
            required
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-lg font-black tracking-[.3em] outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error} Kod ishlamasa, quyidagi <strong>“Kodni qayta yuborish”</strong>ni bosing — eski kod endi amal qilmaydi.
          </p>
        ) : null}
        <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <LockKeyhole className="size-5" />}
          Kirish
        </button>
        <button type="button" onClick={resendCode} disabled={busy} className="flex w-full items-center justify-center gap-2 text-center text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-60">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Kodni qayta yuborish
        </button>
        <button type="button" onClick={() => { setStep('phone'); setError(''); }} className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700">
          Raqamni o‘zgartirish
        </button>
      </form>
    );
  }

  return (
    <form action={requestCode} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-bold">Admin telefon raqami</span>
        <input
          required
          name="phone"
          pattern="\+998\d{9}"
          defaultValue={phone}
          placeholder="+998901234567"
          className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-primary/25"
        />
      </label>
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
        {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
        Telegram’ga kod yuborish
      </button>
    </form>
  );
}
