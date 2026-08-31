import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

import { AdminLoginForm } from '@/components/admin/admin-login-form';

export const metadata: Metadata = { title: 'Admin panel', robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#152a3b] p-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 text-[#152a3b] shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
        <p className="mt-1 text-sm font-bold text-slate-500">Admin panel</p>
        <h1 className="mt-6 text-2xl font-black tracking-[-.03em]">Telefon va Telegram kod bilan kirish</h1>
        <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          Raqamingizni kiriting — bir martalik kod ro‘yxatdan o‘tgan Telegram akkauntingizga yuboriladi. Kirish faqat oldindan qo‘shilgan admin, menejer yoki hisobchi hisoblari uchun ishlaydi.
        </p>
        <div className="mt-7">
          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}
