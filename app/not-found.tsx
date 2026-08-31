import type { Metadata } from 'next';
import { ArrowRight, MapPin, Search } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Sahifa topilmadi', robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f1e8] p-4 text-[#152a3b]">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_70px_rgba(20,40,55,.12)]">
        <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
        <div className="mx-auto mt-8 grid size-16 place-items-center rounded-2xl bg-orange-50">
          <MapPin className="size-8 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-[-.04em]">404 — bu aksiya allaqachon tugagan</h1>
        <p className="mt-3 leading-7 text-slate-600">Qidirgan sahifangiz topilmadi. Ehtimol, havola eskirgan yoki aksiya muddati o‘tgan.</p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <a href="/" className={cn(buttonVariants({ variant: 'outline' }), 'h-12 w-full rounded-xl')}>Bosh sahifa</a>
          <a href="/discover" className={cn(buttonVariants(), 'h-12 w-full rounded-xl font-bold')}>
            <Search className="mr-2 size-4" /> Faol aksiyalar <ArrowRight className="ml-1 size-4" />
          </a>
        </div>
      </section>
    </main>
  );
}
