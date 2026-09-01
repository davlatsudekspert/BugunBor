import type { Metadata } from 'next';

import { ContactForm } from '@/components/contact-form';

export const metadata: Metadata = { title: 'Bog‘lanish', description: 'BugunBor jamoasiga savol yoki noto‘g‘ri ma’lumot haqida xabar yuboring.', alternates: { canonical: '/contact' } };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f1e8] p-4 text-[#152a3b]">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8">
        <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
        <h1 className="mt-8 text-4xl font-black tracking-[-.05em]">Bizga yozing</h1>
        <p className="mt-3 text-slate-600">Savol, shikoyat yoki noto‘g‘ri ma’lumotni yuboring. Har bir murojaat admin jamoasiga yetib boradi va ko‘rsatgan raqamingizga qo‘ng‘iroq qilinadi.</p>
        <ContactForm defaultSubject={subject} />
      </section>
    </main>
  );
}
