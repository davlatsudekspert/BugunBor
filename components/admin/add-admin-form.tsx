'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LoaderCircle, UserPlus } from 'lucide-react';

export function AddAdminForm() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(formData: FormData) {
    setState('loading');
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch('/api/v1/admin/team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: { message: string } };
    if (!response.ok) { setState('error'); setMessage(result.error?.message ?? 'Qo‘shilmadi.'); return; }
    setState('success');
    setMessage('A’zo qo‘shildi. U o‘z raqami bilan /admin sahifasidan kirishi mumkin.');
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Ism familiya</span>
        <input required name="displayName" minLength={2} maxLength={80} className="h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Telefon</span>
        <input required name="phone" pattern="\+998\d{9}" defaultValue="+998" className="h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Lavozim</span>
        <select required name="role" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3">
          <option value="MANAGER">Menejer</option>
          <option value="ACCOUNTANT">Hisobchi</option>
          <option value="SUPER_ADMIN">Bosh admin</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Telegram chat ID</span>
        <input name="telegramChatId" placeholder="Masalan: 123456789" className="h-11 w-full rounded-xl border border-slate-200 px-3" />
        <span className="mt-1 block text-xs text-slate-500">A’zo botga /start yozgach, getUpdates orqali chat ID’ni oling (.env.example’da qo‘llanma bor).</span>
      </label>
      {state === 'error' ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
      {state === 'success' ? <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="size-4" /> {message}</p> : null}
      <button disabled={state === 'loading'} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
        {state === 'loading' ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Qo‘shish
      </button>
    </form>
  );
}
