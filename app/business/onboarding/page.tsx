import type { Metadata } from 'next';
import { BadgeCheck, Building2, MapPin, ShieldCheck } from 'lucide-react';

import { BusinessOnboardingForm } from '@/components/business-onboarding-form';

export const metadata: Metadata = { title: 'Biznesni qo‘shish', description: 'BugunBor’da biznes profilini yaratish va moderatsiyaga yuborish.', robots: { index: false, follow: false } };

export default function BusinessOnboardingPage() {
  return <main className="min-h-screen bg-[#fffdf9] text-[#152a3b]"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a><span className="text-sm font-semibold text-slate-500">Biznes onboarding</span></div></header><div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[.75fr_1.25fr]"><aside><span className="text-sm font-bold uppercase tracking-[.14em] text-primary">1-qadam</span><h1 className="mt-3 text-4xl font-black tracking-[-.05em]">Biznesingizni BugunBor’ga qo‘shing</h1><p className="mt-4 leading-7 text-slate-600">Asosiy ma’lumotni kiriting. Tasdiqlangandan keyin filiallar, jamoa va aksiyalarni boshqarasiz.</p><div className="mt-8 space-y-4 text-sm font-semibold text-slate-700"><p className="flex items-center gap-3"><Building2 className="size-5 text-primary" /> Alohida tenant va ruxsatlar</p><p className="flex items-center gap-3"><MapPin className="size-5 text-primary" /> Filial bo‘yicha takliflar</p><p className="flex items-center gap-3"><BadgeCheck className="size-5 text-primary" /> Moderator tekshiruvi</p><p className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /> Har bir o‘zgarish auditi</p></div></aside><BusinessOnboardingForm /></div></main>;
}
