import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CalendarClock, CheckCircle2, Clock3, MapPin, XCircle } from 'lucide-react';

import { ReviewForm } from '@/components/review-form';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getServerIdentity } from '@/modules/auth/identity';

export const metadata: Metadata = { title: 'Bandliklar tarixi', robots: { index: false, follow: false } };

type Redemption = {
  id: string;
  status: string;
  codeHint: string;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
  dealTitle: string;
  dealSlug: string;
  businessName: string;
  branchName: string;
  address: string;
  reviewId: string | null;
};

const statusLabel: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  CLAIMED: { label: 'Band qilingan', icon: Clock3, className: 'bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Foydalanildi', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700' },
  EXPIRED: { label: 'Muddati tugagan', icon: XCircle, className: 'bg-slate-100 text-slate-500' },
  CANCELED: { label: 'Bekor qilingan', icon: XCircle, className: 'bg-slate-100 text-slate-500' },
};

export default async function RedemptionsPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=/account/redemptions');

  await ensurePhase1Database();
  const redemptions = await getD1()
    .prepare(`
      SELECT r.id, r.status, r.code_hint AS codeHint, r.expires_at AS expiresAt, r.completed_at AS completedAt, r.created_at AS createdAt,
        d.title AS dealTitle, d.slug AS dealSlug, b.name AS businessName, br.name AS branchName, br.address,
        rv.id AS reviewId
      FROM redemptions r
      JOIN deals d ON d.id = r.deal_id
      JOIN businesses b ON b.id = d.business_id
      JOIN branches br ON br.id = r.branch_id
      LEFT JOIN reviews rv ON rv.redemption_id = r.id
      WHERE r.user_id = ?1
      ORDER BY r.created_at DESC
      LIMIT 100
    `)
    .bind(identity.id)
    .all<Redemption>();

  return (
    <main className="min-h-screen bg-[#fffdf9] pb-24 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="text-xl font-black tracking-[-.04em]">Bugun<span className="text-primary">Bor</span></a>
          <a href="/account" className="text-sm font-bold text-slate-600">← Profil</a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black tracking-[-.04em]">Bandliklar tarixi</h1>
        <p className="mt-2 text-slate-500">Band qilgan har bir aksiyangiz va uning holati.</p>

        <div className="mt-8 space-y-3">
          {redemptions.results.length ? (
            redemptions.results.map((redemption) => {
              const status = statusLabel[redemption.status] ?? statusLabel.CLAIMED;
              const StatusIcon = status.icon;
              return (
                <div key={redemption.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(20,40,55,.05)] sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <a href={`/deals/${redemption.dealSlug}`} className="truncate font-black hover:text-primary hover:underline">{redemption.dealTitle}</a>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="size-3.5 shrink-0" /> {redemption.businessName} · {redemption.branchName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><CalendarClock className="size-3.5 shrink-0" /> {new Date(`${redemption.createdAt}Z`).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</p>
                    {redemption.status === 'COMPLETED' && !redemption.reviewId ? <div className="mt-2"><ReviewForm redemptionId={redemption.id} /></div> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-500">…{redemption.codeHint}</span>
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}><StatusIcon className="size-3.5" /> {status.label}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <CalendarClock className="mx-auto size-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-bold">Hali hech qanday bandlik yo‘q</h2>
              <p className="mt-2 text-slate-500">Aksiyadan foydalansangiz, u shu yerda tarix sifatida saqlanadi.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
