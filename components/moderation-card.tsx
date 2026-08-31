'use client';

import { useState } from 'react';

export function ModerationCard({ id, title, businessName, description }: { id: string; title: string; businessName: string; description: string }) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  async function decide(decision: 'APPROVE' | 'REJECT') {
    setStatus('loading');
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (window.location.hostname === 'localhost') headers['x-bugunbor-demo-user'] = 'usr_moderator_browser';
    const response = await fetch(`/api/v1/moderation/deals/${id}/decision`, { method: 'POST', headers, body: JSON.stringify({ decision, reason }) });
    const result = await response.json() as { data?: { status: string }; error?: { message: string } };
    if (!response.ok) { setStatus('error'); setMessage(result.error?.message ?? 'Qaror saqlanmadi.'); return; }
    setStatus('done'); setMessage(`Yangi holat: ${result.data?.status}`);
  }
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-primary">{businessName}</p><h2 className="mt-1 text-xl font-black">{title}</h2></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Tekshiruvda</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p><label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Majburiy sabab</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Qaror sababini aniq yozing…" /></label>{message ? <p className={`mt-3 text-sm font-semibold ${status === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{message}</p> : null}<div className="mt-4 flex gap-2"><button onClick={() => decide('APPROVE')} disabled={status === 'loading' || status === 'done'} className="h-10 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-50">Tasdiqlash</button><button onClick={() => decide('REJECT')} disabled={status === 'loading' || status === 'done'} className="h-10 flex-1 rounded-xl bg-red-50 text-sm font-bold text-red-700 disabled:opacity-50">Rad etish</button></div></article>;
}
