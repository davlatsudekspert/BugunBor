import type { Metadata } from 'next';

import { AnnouncementComposer } from '@/components/admin/announcement-composer';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireAdminPage } from '@/modules/admin/guard';

export const metadata: Metadata = { title: 'Reklama va e’lonlar', robots: { index: false, follow: false } };

type ActiveDeal = { id: string; title: string; slug: string; discountPercent: number; businessName: string };
type AnnouncementRow = { id: string; message: string; status: string; error: string | null; createdAt: string };

export default async function AdminAnnouncementsPage() {
  await requireAdminPage('admin.announcements.manage');
  await ensurePhase1Database();
  const db = getD1();

  const [deals, history] = await Promise.all([
    db
      .prepare(`SELECT d.id, d.title, d.slug, d.discount_percent AS discountPercent, b.name AS businessName
        FROM deals d JOIN businesses b ON b.id = d.business_id
        WHERE d.status = 'ACTIVE' AND d.deleted_at IS NULL ORDER BY d.created_at DESC LIMIT 30`)
      .all<ActiveDeal>(),
    db.prepare(`SELECT id, message, status, error, created_at AS createdAt FROM admin_announcements ORDER BY created_at DESC LIMIT 15`).all<AnnouncementRow>(),
  ]);

  return (
    <main className="px-4 py-8 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Marketing</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Reklama va e’lonlar</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Faol aksiyani yoki erkin xabarni BugunBor Telegram kanaliga joylang. Har bir yuborish tarixda saqlanadi.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <AnnouncementComposer deals={deals.results} />

        <div>
          <h2 className="text-lg font-black">So‘nggi yuborilganlar</h2>
          <div className="mt-4 space-y-3">
            {history.results.length ? (
              history.results.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="whitespace-pre-wrap text-sm text-[#152a3b]">{entry.message}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={entry.status === 'SENT' ? 'font-bold text-emerald-700' : 'font-bold text-red-700'}>{entry.status === 'SENT' ? 'Yuborildi' : `Xato: ${entry.error}`}</span>
                    <span className="text-slate-400">{new Date(`${entry.createdAt}Z`).toLocaleString('uz-UZ')}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Hali reklama yuborilmagan.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
