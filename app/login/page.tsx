import type { Metadata } from 'next';

import { CustomerLoginForm } from '@/components/customer-login-form';

export const metadata: Metadata = { title: 'Kirish', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/discover';
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f1e8] p-4 text-[#152a3b]">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(20,40,55,.12)]">
        <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
        <h1 className="mt-8 text-3xl font-black tracking-[-.04em]">Xavfsiz kirish</h1>
        <p className="mt-3 leading-7 text-slate-600">Telefon raqamingizni kiriting — kirish kodi Telegram orqali yuboriladi.</p>
        <div className="mt-6">
          <CustomerLoginForm returnTo={safeReturn} />
        </div>
      </section>
    </main>
  );
}
