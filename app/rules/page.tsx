import type { Metadata } from 'next';
import { AlertTriangle, Ban, FileCheck2, Gavel, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Qoidalar',
  description: 'BugunBor’da aksiya joylash qoidalari: aniq narx, rost ma’lumot va aldovchi reklama uchun javobgarlik.',
  alternates: { canonical: '/rules' },
};

const rules = [
  {
    icon: FileCheck2,
    title: 'Narx va chegirma rost bo‘lishi shart',
    text: 'Ko‘rsatilgan “eski narx” so‘nggi haqiqiy sotuv narxi bo‘lishi kerak. Sun’iy oshirilgan narxdan “chegirma” hisoblab ko‘rsatish taqiqlanadi.',
  },
  {
    icon: ShieldCheck,
    title: 'Miqdor va muddat aniq ko‘rsatiladi',
    text: 'Cheklangan miqdor yoki vaqt e’lon qilingan bo‘lsa, u haqiqatga mos bo‘lishi kerak. Tugagan yoki mavjud bo‘lmagan taklifni faol ko‘rsatish taqiqlanadi.',
  },
  {
    icon: Gavel,
    title: 'Iste’molchi huquqlari qonunchiligiga rioya',
    text: 'Barcha bizneslar O‘zbekiston Respublikasining “Iste’molchilar huquqlarini himoya qilish to‘g‘risida”gi qonuniga va reklama sohasidagi qonunchilikka rioya qilishi shart.',
  },
  {
    icon: AlertTriangle,
    title: 'Moderatsiya har bir aksiyani tekshiradi',
    text: 'Yangi aksiya avval moderatsiyadan o‘tadi. Shubhali yoki tekshirib bo‘lmaydigan ma’lumot rad etiladi va sababi biznesga ko‘rsatiladi.',
  },
  {
    icon: Ban,
    title: 'Aldash va yolg‘on ma’lumot uchun javobgarlik',
    text: 'Aniqlangan har bir buzilish: 1) ogohlantirish va aksiyani olib tashlash, 2) takrorlansa — biznes profili vaqtincha to‘xtatiladi, 3) qasddan aldash aniqlansa — profil butunlay bloklanadi.',
  },
];

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-[#fffdf9] text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <a href="/" className="text-xl font-black">Bugun<span className="text-primary">Bor</span></a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Ishonch asosida</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">Aksiya joylash qoidalari</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          BugunBor faqat rost va tekshirilgan takliflarni ko‘rsatishga intiladi. Biznes profilini yaratish yoki aksiya joylashdan oldin har bir hamkor quyidagi qoidalarga roziligini bildiradi.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {rules.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <Icon className="size-6 text-primary" />
              <h2 className="mt-4 font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <h2 className="font-black">Noto‘g‘ri ma’lumot ko‘rdingizmi?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Har qanday aksiya sahifasida “Noto‘g‘ri ma’lumot haqida xabar berish” havolasi orqali, yoki to‘g‘ridan-to‘g‘ri <a href="/contact" className="font-bold text-primary underline underline-offset-2">bog‘lanish sahifasi</a> orqali moderatsiyaga yozishingiz mumkin. Har bir murojaat ko‘rib chiqiladi.</p>
        </div>

        <p className="mt-8 text-xs leading-5 text-slate-400">Ushbu sahifa umumiy platforma qoidalarini tavsiflaydi va yuridik maslahat o‘rnini bosmaydi. Nizoli holatlar amaldagi qonunchilik asosida hal qilinadi.</p>
      </div>
    </main>
  );
}
