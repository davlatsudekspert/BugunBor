import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import { BusinessDealForm } from '@/components/business-deal-form';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { canAccessBusiness, type BusinessRole } from '@/modules/auth/authorization';
import { getServerIdentity } from '@/modules/auth/identity';

export const metadata: Metadata = { title: 'Yangi aksiya', robots: { index: false, follow: false } };

export default async function NewBusinessDealPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect('/login?returnTo=%2Fbusiness%2Fdeals%2Fnew');

  await ensurePhase1Database();
  const db = getD1();
  const membership = await db
    .prepare(`SELECT bm.business_id AS businessId, bm.role FROM business_members bm WHERE bm.user_id = ?1 AND bm.revoked_at IS NULL ORDER BY bm.created_at DESC LIMIT 1`)
    .bind(identity.id)
    .first<{ businessId: string; role: BusinessRole }>();

  const canWrite = membership && canAccessBusiness({ requestedBusinessId: membership.businessId, membershipBusinessId: membership.businessId, role: membership.role, action: 'deal.write' });
  const business = canWrite
    ? await db.prepare('SELECT id, name, verification_status AS verificationStatus FROM businesses WHERE id = ?1 AND deleted_at IS NULL').bind(membership!.businessId).first<{ id: string; name: string; verificationStatus: string }>()
    : null;
  const branches = business
    ? (await db.prepare('SELECT id, name FROM branches WHERE business_id = ?1 AND deleted_at IS NULL ORDER BY created_at ASC').bind(business.id).all<{ id: string; name: string }>()).results
    : [];

  return (
    <main className="min-h-screen bg-[#fffdf9] text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
          <a href="/business/dashboard" className="text-sm font-bold text-slate-500">← Dashboard</a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Aksiyalarim</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">Yangi aksiya joylash</h1>

        {!business ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-500" />
            <h2 className="mt-4 text-xl font-black">Sizda aksiya qo‘shish huquqi yo‘q</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600">Avval biznes profilini yarating, yoki egasidan sizga aksiya qo‘shish huquqi (rol) berishini so‘rang.</p>
            <a href="/business/onboarding" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 font-bold text-white">Biznes qo‘shish</a>
          </div>
        ) : business.verificationStatus !== 'VERIFIED' ? (
          <div className="mt-8 rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-10 text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-500" />
            <h2 className="mt-4 text-xl font-black text-amber-900">Profil hali tasdiqlanmagan</h2>
            <p className="mx-auto mt-2 max-w-md text-amber-800">“{business.name}” moderator tekshiruvidan o‘tgach, aksiya qo‘sha olasiz. Holatni dashboardda kuzating.</p>
            <a href="/business/dashboard" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 font-bold text-white">Dashboardga qaytish</a>
          </div>
        ) : (
          <div className="mt-8">
            <BusinessDealForm branches={branches} />
          </div>
        )}
      </div>
    </main>
  );
}
