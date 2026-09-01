import type { Metadata } from 'next';
import { BadgeCheck, Building2, MapPin, ShieldCheck } from 'lucide-react';

import { BusinessOnboardingForm } from '@/components/business-onboarding-form';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getServerIdentity } from '@/modules/auth/identity';
import { listOwnedBusinesses } from '@/modules/catalog/ownership';

export const metadata: Metadata = { title: 'Biznesni qo‘shish', description: 'BugunBor’da biznes profilini yaratish va moderatsiyaga yuborish.', robots: { index: false, follow: false } };

export default async function BusinessOnboardingPage() {
  const identity = await getServerIdentity();
  const existingBusinesses = identity
    ? await (async () => {
        await ensurePhase1Database();
        return listOwnedBusinesses(getD1(), identity.id);
      })()
    : [];
  // Submitting this form always creates a NEW business — nothing here stopped someone from
  // doing that by mistake when they already had one, which is exactly how a real (verified,
  // with real deals) business ended up buried behind a second, empty one: the dashboard used
  // to show only the newest membership (see modules/catalog/ownership.ts's getOwnedBusiness).
  // That's fixed now, but this banner is the other half — showing what already exists before
  // someone re-submits, so a second business is a deliberate choice, not an accident.
  const hasExisting = existingBusinesses.length > 0;

  return (
    <main className="min-h-screen bg-[#fffdf9] text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
          <span className="text-sm font-semibold text-slate-500">Biznes onboarding</span>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[.75fr_1.25fr]">
        <aside>
          <span className="text-sm font-bold uppercase tracking-[.14em] text-primary">{hasExisting ? 'Yana bitta biznes' : '1-qadam'}</span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.05em]">{hasExisting ? 'Yana bitta biznes qo‘shasizmi?' : 'Biznesingizni BugunBor’ga qo‘shing'}</h1>
          <p className="mt-4 leading-7 text-slate-600">Asosiy ma’lumotni kiriting. Tasdiqlangandan keyin filiallar, jamoa va aksiyalarni boshqarasiz.</p>
          <div className="mt-8 space-y-4 text-sm font-semibold text-slate-700">
            <p className="flex items-center gap-3"><Building2 className="size-5 text-primary" /> Alohida tenant va ruxsatlar</p>
            <p className="flex items-center gap-3"><MapPin className="size-5 text-primary" /> Filial bo‘yicha takliflar</p>
            <p className="flex items-center gap-3"><BadgeCheck className="size-5 text-primary" /> Moderator tekshiruvi</p>
            <p className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /> Har bir o‘zgarish auditi</p>
          </div>
        </aside>
        <div className="space-y-6">
          {hasExisting ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <p className="font-black text-amber-900">Sizda allaqachon {existingBusinesses.length > 1 ? `${existingBusinesses.length} ta biznes bor` : 'biznes bor'}:</p>
              <ul className="mt-3 space-y-2">
                {existingBusinesses.map((business) => (
                  <li key={business.id}>
                    <a href={`/business/dashboard?business=${business.id}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#152a3b] shadow-sm hover:text-primary">
                      {business.name}
                      <span className="text-xs font-semibold text-slate-400">{business.verificationStatus} → Dashboard</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-6 text-amber-800">Agar shu biznesga aksiya qo‘shmoqchi bo‘lsangiz, yuqoridagi havoladan dashboardga o‘ting — pastdagi shakl esa butunlay YANGI, alohida biznes yaratadi.</p>
            </div>
          ) : null}
          <BusinessOnboardingForm />
        </div>
      </div>
    </main>
  );
}
