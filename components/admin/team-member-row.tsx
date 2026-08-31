'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, LoaderCircle, RotateCcw, ShieldCheck } from 'lucide-react';

type Member = { id: string; phone: string; displayName: string; role: string; status: string; telegramChatId: string | null; createdAt: string };

const roleLabels: Record<string, string> = { SUPER_ADMIN: 'Bosh admin', MANAGER: 'Menejer', ACCOUNTANT: 'Hisobchi' };

export function TeamMemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function update(patch: Record<string, string>) {
    setBusy(true);
    setError('');
    const response = await fetch(`/api/v1/admin/team/${member.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const result = (await response.json()) as { data?: { role: string; status: string }; error?: { message: string } };
    setBusy(false);
    if (!response.ok) { setError(result.error?.message ?? 'Yangilanmadi.'); return; }
    setRole(result.data!.role);
    setStatus(result.data!.status);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-black">{member.displayName} {isSelf ? <span className="text-xs font-semibold text-slate-400">(siz)</span> : null}</p>
          <p className="text-sm text-slate-500">{member.phone}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{status === 'ACTIVE' ? 'Faol' : 'To‘xtatilgan'}</span>
      </div>

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        {isSelf ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><ShieldCheck className="size-3.5" /> {roleLabels[role] ?? role}</span>
        ) : (
          <>
            <select value={role} onChange={(event) => update({ role: event.target.value })} disabled={busy} className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold">
              <option value="MANAGER">Menejer</option>
              <option value="ACCOUNTANT">Hisobchi</option>
              <option value="SUPER_ADMIN">Bosh admin</option>
            </select>
            {status === 'ACTIVE' ? (
              <button onClick={() => update({ status: 'SUSPENDED' })} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50">
                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />} To‘xtatish
              </button>
            ) : (
              <button onClick={() => update({ status: 'ACTIVE' })} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">
                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} Tiklash
              </button>
            )}
          </>
        )}
        <span className="text-xs text-slate-400">{member.telegramChatId ? 'Telegram ulangan' : 'Telegram chat ID yo‘q'}</span>
      </div>
    </div>
  );
}
