'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LockKeyhole, Send, RotateCcw } from 'lucide-react';

type Step = 'phone' | 'telegram_link' | 'code';

export function CustomerLoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+998');
  const [deepLink, setDeepLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function requestCode(formData: FormData) {
    const rawPhone = formData.get('phone');
    const submittedPhone = typeof rawPhone === 'string' ? rawPhone : phone;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: submittedPhone }),
      });
      const result = (await response.json()) as { data?: { status: string; telegramDeepLink?: string }; error?: { message: string } };
      if (!response.ok) { setError(result.error?.message ?? 'So‘rov bajarilmadi.'); return; }
      setPhone(submittedPhone);
      if (result.data?.status === 'NEEDS_TELEGRAM_LINK' && result.data.telegramDeepLink) {
        setDeepLink(result.data.telegramDeepLink);
        setStep('telegram_link');
      } else {
        setStep('code');
      }
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }

  async function retryAfterLink() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const result = (await response.json()) as { data?: { status: string }; error?: { message: string } };
      if (!response.ok) { setError(result.error?.message ?? 'So‘rov bajarilmadi.'); return; }
      if (result.data?.status === 'SENT') setStep('code');
      else setError('Hali bog‘lanmadi — botda “Start” bosganingizga ishonch hosil qiling.');
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(formData: FormData) {
    const rawCode = formData.get('code');
    const code = typeof rawCode === 'string' ? rawCode : '';
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const result = (await response.json()) as { error?: { message: string } };
      if (!response.ok) { setError(result.error?.message ?? 'Kod noto‘g‘ri yoki eskirgan.'); return; }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError('Tarmoq xatosi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'telegram_link') {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Kirish kodini yuborish uchun avval Telegram botimizni oching, <strong>Start</strong> tugmasini bosing, so‘ng chiqqan tugma orqali telefon raqamingizni ulashing.
        </p>
        <a href={deepLink} target="_blank" rel="noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white">
          <Send className="size-5" /> Telegram botni ochish
        </a>
        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button onClick={retryAfterLink} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 font-bold text-[#152a3b] disabled:opacity-60">
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <RotateCcw className="size-5" />}
          Raqamni ulashdim, kodni yuboring
        </button>
        <button type="button" onClick={() => { setStep('phone'); setError(''); }} className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700">
          Raqamni o‘zgartirish
        </button>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form action={verifyCode} className="space-y-4">
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Kod Telegram orqali yuborildi.</p>
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
        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <LockKeyhole className="size-5" />}
          Kirish
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
        <span className="mb-2 block text-sm font-bold">Telefon raqamingiz</span>
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
