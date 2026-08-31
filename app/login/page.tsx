import type { Metadata } from 'next';
import { LockKeyhole, MessageSquareText, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = { title: 'Kirish', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/discover';
  return <main className="grid min-h-screen place-items-center bg-[#f8f1e8] p-4 text-[#152a3b]"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(20,40,55,.12)]"><a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a><h1 className="mt-8 text-3xl font-black tracking-[-.04em]">Xavfsiz kirish</h1><p className="mt-3 leading-7 text-slate-600">Bu xususiy preview Codex/Sites sessiyasi orqali himoyalangan. Ochiq versiyada telefon va email OTP providerlari shu oynada ulanadi.</p><div className="mt-6 space-y-3 text-sm font-semibold text-slate-700"><p className="flex items-center gap-3"><MessageSquareText className="size-5 text-primary" /> OTP muddati va urinish limiti</p><p className="flex items-center gap-3"><LockKeyhole className="size-5 text-primary" /> HTTP-only sessiya va bekor qilish</p><p className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /> Telefon +998 formatida normallashtiriladi</p></div><a href={safeReturn} className="mt-7 flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-white">Sessiya bilan davom etish</a><p className="mt-4 text-xs leading-5 text-slate-500">Real SMS yuborilishi credential bo‘lmaganda production’da muvaffaqiyat sifatida ko‘rsatilmaydi.</p></section></main>;
}
