import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CalendarClock, Heart, LogOut, ShieldCheck, UserRound } from 'lucide-react';

import { AccountNfcStoreForm } from '@/components/account-nfcstore-form';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getServerIdentity } from '@/modules/auth/identity';

export const metadata: Metadata = { title: 'Mening hisobim', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=/account');

  await ensurePhase1Database();
  const user = await getD1()
    .prepare(`SELECT display_name AS displayName, phone, email, created_at AS createdAt, nfcstore_profile_url AS nfcstoreProfileUrl FROM users WHERE id = ?1`)
    .bind(identity.id)
    .first<{ displayName: string; phone: string | null; email: string | null; createdAt: string; nfcstoreProfileUrl: string | null }>();
  const [{ savedCount } = { savedCount: 0 }] = (
    await getD1().prepare(`SELECT COUNT(*) AS savedCount FROM favorites WHERE user_id = ?1`).bind(identity.id).all<{ savedCount: number }>()
  ).results;
  const [{ redemptionCount } = { redemptionCount: 0 }] = (
    await getD1().prepare(`SELECT COUNT(*) AS redemptionCount FROM redemptions WHERE user_id = ?1`).bind(identity.id).all<{ redemptionCount: number }>()
  ).results;

  return (
    <main className="min-h-screen bg-[#fffdf9] pb-24 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="text-xl font-black tracking-[-.04em]">Bugun<span className="text-primary">Bor</span></a>
          <a href="/discover" className="text-sm font-bold text-slate-600">Aksiyalarga qaytish</a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(20,40,55,.08)]">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#152a3b] text-xl font-black text-white">
            {(user?.displayName ?? 'B').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-[-.03em]">{user?.displayName ?? 'BugunBor mijozi'}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {user?.phone ? <span>{user.phone}</span> : null}
              {user?.email ? <span>{user.email}</span> : null}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a href="/account/saved" aria-label={`Saqlangan aksiyalar, ${savedCount} ta`} className="group flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(20,40,55,.05)] transition hover:border-primary">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-orange-50 text-primary"><Heart className="size-6" /></div>
              <div>
                <p className="font-black">Saqlangan aksiyalar</p>
                <p className="text-sm text-slate-500">{savedCount} ta aksiya</p>
              </div>
            </div>
          </a>
          <a href="/account/redemptions" aria-label={`Bandliklar tarixi, ${redemptionCount} ta`} className="group flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(20,40,55,.05)] transition hover:border-primary">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CalendarClock className="size-6" /></div>
              <div>
                <p className="font-black">Bandliklar tarixi</p>
                <p className="text-sm text-slate-500">{redemptionCount} ta band qilingan</p>
              </div>
            </div>
          </a>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-600"><ShieldCheck className="size-4 text-emerald-600" /> Hisobingiz {identity.role === 'CUSTOMER' ? 'mijoz' : identity.role.toLowerCase()} sifatida ro‘yxatdan o‘tgan{user?.createdAt ? `, ${new Date(`${user.createdAt}Z`).toLocaleDateString('uz-UZ')} dan beri` : ''}.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/business/onboarding" className="flex items-center gap-2 text-sm font-bold text-primary"><UserRound className="size-4" /> Biznes sifatida qo‘shilish</a>
            <a href="/login" className="flex items-center gap-2 text-sm font-bold text-slate-500"><LogOut className="size-4" /> Chiqish</a>
          </div>
        </div>

        <AccountNfcStoreForm initialUrl={user?.nfcstoreProfileUrl ?? null} />
      </div>
    </main>
  );
}
