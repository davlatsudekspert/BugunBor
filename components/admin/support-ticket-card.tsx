'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, MessageCircle, Phone } from 'lucide-react';

type Ticket = { id: string; name: string; phone: string; subject: string; message: string; source: string; status: string; createdAt: string };

const statusLabels: Record<string, string> = { OPEN: 'Yangi', IN_PROGRESS: 'Ko‘rib chiqilmoqda', RESOLVED: 'Hal qilindi' };
const statusStyles: Record<string, string> = { OPEN: 'bg-amber-50 text-amber-700', IN_PROGRESS: 'bg-sky-50 text-sky-700', RESOLVED: 'bg-emerald-50 text-emerald-700' };
const sourceLabels: Record<string, string> = { CONTACT_FORM: 'Bog‘lanish formasi', AI_ASSISTANT: 'AI Yordamchi' };

export function SupportTicketCard({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [busy, setBusy] = useState(false);

  async function update(nextStatus: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/admin/support/${ticket.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (response.ok) { setStatus(nextStatus); router.refresh(); }
    } finally {
      // A network drop must never leave these buttons stuck spinning/disabled forever.
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><MessageCircle className="size-3.5" /> {sourceLabels[ticket.source] ?? ticket.source}</p>
          <h2 className="mt-1 text-lg font-black">{ticket.subject}</h2>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status] ?? statusStyles.OPEN}`}>{statusLabels[status] ?? status}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{ticket.message}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
        <a href={`tel:${ticket.phone}`} className="flex items-center gap-1.5 font-bold text-primary"><Phone className="size-4" /> {ticket.name} — {ticket.phone}</a>
        <div className="flex gap-2">
          {status !== 'IN_PROGRESS' ? (
            <button onClick={() => update('IN_PROGRESS')} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-50">
              {busy ? <LoaderCircle className="inline size-3.5 animate-spin" /> : 'Ko‘rib chiqilmoqda'}
            </button>
          ) : null}
          {status !== 'RESOLVED' ? (
            <button onClick={() => update('RESOLVED')} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              Hal qilindi
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
