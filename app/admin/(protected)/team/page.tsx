import type { Metadata } from 'next';

import { AddAdminForm } from '@/components/admin/add-admin-form';
import { TeamMemberRow } from '@/components/admin/team-member-row';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireAdminPage } from '@/modules/admin/guard';

export const metadata: Metadata = { title: 'Admin jamoa', robots: { index: false, follow: false } };

type AdminRow = { id: string; phone: string; displayName: string; role: string; status: string; telegramChatId: string | null; createdAt: string };

export default async function AdminTeamPage() {
  const admin = await requireAdminPage('admin.team.manage');
  await ensurePhase1Database();
  const rows = await getD1()
    .prepare(`SELECT id, phone, display_name AS displayName, role, status, telegram_chat_id AS telegramChatId, created_at AS createdAt FROM admin_users ORDER BY created_at ASC`)
    .all<AdminRow>();

  return (
    <main className="px-4 py-8 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Kirish nazorati</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Admin jamoa</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Menejer va hisobchilarni shu yerdan qo‘shasiz. Har biri o‘z telefon raqami va Telegram kodi bilan mustaqil kiradi.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <div className="space-y-3">
          {rows.results.map((row) => (
            <TeamMemberRow key={row.id} member={row} isSelf={row.id === admin.id} />
          ))}
        </div>
        <div>
          <h2 className="text-lg font-black">Yangi a’zo qo‘shish</h2>
          <div className="mt-4">
            <AddAdminForm />
          </div>
        </div>
      </div>
    </main>
  );
}
