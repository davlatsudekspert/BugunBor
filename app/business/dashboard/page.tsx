import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Activity, BadgeCheck, Eye, QrCode, TicketCheck } from 'lucide-react';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getServerIdentity } from '@/modules/auth/identity';

export const metadata: Metadata = { title: 'Biznes dashboard', robots: { index: false, follow: false } };

type OwnedBusiness = { id: string; name: string; verificationStatus: string; role: string };
type Metrics = { deals: number; activeDeals: number; redemptions: number };

export default async function BusinessDashboardPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=%2Fbusiness%2Fdashboard');

  await ensurePhase1Database();
  const business = await getD1()
    .prepare(`
      SELECT b.id, b.name, b.verification_status AS verificationStatus, bm.role AS role
      FROM business_members bm
      JOIN businesses b ON b.id = bm.business_id
      WHERE bm.user_id = ?1 AND bm.revoked_at IS NULL AND b.deleted_at IS NULL
      ORDER BY bm.created_at DESC
      LIMIT 1
    `)
    .bind(identity.id)
    .first<OwnedBusiness>();

  const metrics = business
    ? await getD1()
        .prepare(`
          SELECT COUNT(DISTINCT d.id) AS deals,
            SUM(CASE WHEN d.status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeDeals,
            COUNT(r.id) AS redemptions
          FROM deals d LEFT JOIN redemptions r ON r.deal_id = d.id
          WHERE d.business_id = ?1
        `)
        .bind(business.id)
        .first<Metrics>()
    : null;

  const cards = [
    { label: 'Faol aksiyalar', value: metrics?.activeDeals ?? 0, icon: Activity },
    { label: 'Jami aksiyalar', value: metrics?.deals ?? 0, icon: Eye },
    { label: 'Band qilishlar', value: metrics?.redemptions ?? 0, icon: TicketCheck },
    { label: 'NFC tashriflar', value: 0, icon: QrCode },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
          <a href="/business/onboarding" className="text-sm font-bold text-primary">+ Yangi biznes</a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {business ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Business workspace</p>
                <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{business.name}</h1>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
                <BadgeCheck className="size-4 text-emerald-600" /> {business.verificationStatus}
              </span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <Icon className="size-5 text-primary" />
                  <strong className="mt-7 block text-3xl font-black">{value}</strong>
                  <span className="text-sm text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black">Keyingi qadam</h2>
              <p className="mt-2 text-slate-600">Tasdiqlash holatini kuzating, so‘ng filial va birinchi aksiyani kiriting. Tenant tekshiruvi har bir yozuvda server tomonida ishlaydi.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href="/business/onboarding" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">Profilni to‘ldirish</a>
                {['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(identity.role) ? (
                  <a href="/admin/deals" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Moderatsiya navbati</a>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Business workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Sizda hali biznes profili yo‘q</h1>
            <p className="mx-auto mt-3 max-w-md text-slate-600">Dashboardni ko‘rish uchun avval biznesingizni qo‘shing. Ariza yuborilgach, u shu yerda moderator tasdig‘ini kutadi.</p>
            <a href="/business/onboarding" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 font-bold text-white">Biznes qo‘shish</a>
          </div>
        )}
      </div>
    </main>
  );
}
