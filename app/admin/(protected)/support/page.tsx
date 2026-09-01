import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';

import { SupportTicketCard } from '@/components/admin/support-ticket-card';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireAdminPage } from '@/modules/admin/guard';

export const metadata: Metadata = { title: 'Murojaatlar', robots: { index: false, follow: false } };

type Ticket = { id: string; name: string; phone: string; subject: string; message: string; source: string; status: string; createdAt: string };

export default async function AdminSupportPage() {
  await requireAdminPage('admin.support.manage');
  await ensurePhase1Database();
  const tickets = await getD1()
    .prepare(`SELECT id, name, phone, subject, message, source, status, created_at AS createdAt FROM support_tickets ORDER BY CASE status WHEN 'OPEN' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END, created_at DESC LIMIT 100`)
    .all<Ticket>();

  return (
    <main className="px-4 py-8 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Mijozlar bilan aloqa</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-black tracking-[-.04em]"><Megaphone className="size-7 text-primary" /> Murojaatlar</h1>
      <p className="mt-3 max-w-2xl text-slate-600">“Bog‘lanish” formasi va AI Yordamchi orqali kelgan har bir murojaat shu yerda. Ism va telefon raqami orqali qo‘ng‘iroq qiling.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {tickets.results.length ? (
          tickets.results.map((ticket) => <SupportTicketCard key={ticket.id} ticket={ticket} />)
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500 md:col-span-2">Hozircha murojaat yo‘q.</p>
        )}
      </div>
    </main>
  );
}
