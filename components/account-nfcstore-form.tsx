'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, LoaderCircle, Trash2 } from 'lucide-react';

/**
 * Optional, bonus-free NFCStore.uz personal profile link — see app/api/v1/account/nfcstore
 * and lib/nfcstore.ts. Adding or removing it never blocks anything else on this page; there
 * is no discount, cashback, or wallet credit tied to it today (see that route's own comment).
 */
export function AccountNfcStoreForm({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter();
  const [savedUrl, setSavedUrl] = useState(initialUrl);
  const [editing, setEditing] = useState(!initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(formData: FormData) {
    const profileUrl = formData.get('profileUrl');
    if (typeof profileUrl !== 'string' || !profileUrl.trim()) return;
    setBusy(true);
    setError('');
    const response = await fetch('/api/v1/account/nfcstore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileUrl }),
    });
    const result = (await response.json()) as { data?: { profileUrl: string }; error?: { message: string } };
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'Saqlanmadi.'); return; }
    setSavedUrl(result.data!.profileUrl);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError('');
    const response = await fetch('/api/v1/account/nfcstore', { method: 'DELETE' });
    setBusy(false);
    if (!response.ok) { setError('O‘chirilmadi.'); return; }
    setSavedUrl(null);
    setEditing(true);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
      <p className="font-black">NFCStore profilingiz</p>
      {error ? <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

      {savedUrl && !editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a href={savedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-[#152a3b] hover:text-primary">
            <ExternalLink className="size-4" /> NFCStore profilini ko‘rish
          </a>
          <button onClick={() => setEditing(true)} className="text-sm font-bold text-slate-500 hover:text-primary">O‘zgartirish</button>
          <button onClick={remove} disabled={busy} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-red-600 disabled:opacity-50">
            {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} O‘chirish
          </button>
        </div>
      ) : (
        <form action={save} className="mt-3 flex flex-wrap gap-2">
          <input
            name="profileUrl"
            defaultValue={savedUrl ?? ''}
            placeholder="https://nfcstore.uz/..."
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/25"
          />
          <button disabled={busy} className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null} Saqlash
          </button>
          {savedUrl ? (
            <button type="button" onClick={() => setEditing(false)} className="text-sm font-bold text-slate-500">Bekor qilish</button>
          ) : null}
        </form>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-500">NFCStore profilingiz bo‘lsa, havolasini qo‘shishingiz mumkin. Bu majburiy emas.</p>
    </div>
  );
}
