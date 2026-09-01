'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, LoaderCircle, MessageCircleQuestion, Send, Sparkles, X } from 'lucide-react';

type FaqEntry = { keywords: string[]; question: string; answer: string; href?: string; linkLabel?: string };

const faq: FaqEntry[] = [
  {
    keywords: ['aksiya', 'chegirma', 'ol', 'qanday', 'band'],
    question: 'Aksiyani qanday olsam bo‘ladi?',
    answer: 'Kerakli aksiyani oching, “Aksiyadan foydalanish” tugmasini bosing — 15 daqiqa amal qiladigan bir martalik kod olasiz. Kodni filialda ko‘rsating yoki onlayn vaucher bo‘lsa, ekranda saqlang.',
    href: '/discover',
    linkLabel: 'Faol aksiyalarni ko‘rish',
  },
  {
    keywords: ['narx', 'rost', 'ishonch', 'aldash', 'yolgon', 'yolg‘on'],
    question: 'Ko‘rsatilgan narxlar va chegirmalar rostmi?',
    answer: 'Har bir aksiya moderatsiyadan o‘tadi va narxlarning haqiqiyligi tekshiriladi. Agar noto‘g‘ri narx yoki aldovchi ma’lumot ko‘rsangiz, darhol xabar bering — tekshirilib, kerak bo‘lsa biznes profili to‘xtatiladi.',
    href: '/rules',
    linkLabel: 'Qoidalarni o‘qish',
  },
  {
    keywords: ['biznes', 'qoshil', 'qo‘sh', 'hamkor', 'sotuvchi', 'do‘kon', 'dokon'],
    question: 'Biznes sifatida qanday qo‘shilaman?',
    answer: '“Biznes uchun” bo‘limidan ariza to‘ldiring. Moderator tekshiruvidan so‘ng dashboardda filial va aksiyalaringizni boshqara olasiz.',
    href: '/business/onboarding',
    linkLabel: 'Biznes qo‘shish',
  },
  {
    keywords: ['pro', 'reja', 'narxlash', 'tolov', 'to‘lov', 'obuna'],
    question: 'Pro reja nima beradi?',
    answer: 'Pro reja cheksiz filial va aksiya, qidiruvda ustuvor (sponsored) joylashuv va batafsil analitika beradi. Narxlar biznes uchun aniq ko‘rsatiladi va istalgan vaqt bekor qilinishi mumkin.',
  },
  {
    keywords: ['shikoyat', 'xato', 'notogri', 'noto‘g‘ri', 'muammo', 'bogla', 'bog‘lan'],
    question: 'Xato yoki shikoyatni qayerga yuboraman?',
    answer: 'Shu suhbatga yozing yoki bog‘lanish sahifasidan xabar qoldiring — jamoamiz ko‘rsatgan raqamingizga qo‘ng‘iroq qiladi.',
    href: '/contact',
    linkLabel: 'Bog‘lanish',
  },
  {
    keywords: ['kirish', 'login', 'hisob', 'akkaunt'],
    question: 'Tizimga qanday kiraman?',
    answer: 'Mijozlar “Kirish” tugmasi orqali telefon raqami bilan kiradi. Biznes egalari ham xuddi shu orqali, admin jamoa esa alohida /admin panelidan Telegram kod bilan kiradi.',
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’ʻʼ`]/g, '‘')
    .replace(/[^a-z0-9‘ ]/g, ' ');
}

function findAnswer(query: string): FaqEntry | null {
  const words = normalize(query).split(/\s+/).filter((word) => word.length > 2);
  if (!words.length) return null;
  let best: { entry: FaqEntry; score: number } | null = null;
  for (const entry of faq) {
    const haystack = normalize(`${entry.question} ${entry.keywords.join(' ')}`);
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry ?? null;
}

type ChatMessage = { role: 'user' | 'assistant'; text: string; href?: string; linkLabel?: string };
type Contact = { name: string; phone: string };

const CONTACT_STORAGE_KEY = 'bugunbor_ai_contact';

export function AiAssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [contact, setContact] = useState<Contact | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(CONTACT_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Contact) : null;
    } catch {
      // Private browsing or blocked storage — just ask again, no big deal.
      return null;
    }
  });
  const [contactSaving, setContactSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Salom! BugunBor yordamchisiman. Aksiya, narxlar, biznes uchun qo‘shilish yoki qoidalar haqida so‘rang.' },
  ]);

  const suggestions = useMemo(() => faq.slice(0, 3), []);

  if (pathname?.startsWith('/admin')) return null;

  async function submitContact(formData: FormData) {
    const rawName = formData.get('name');
    const rawPhone = formData.get('phone');
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const phone = typeof rawPhone === 'string' ? rawPhone.trim() : '';
    if (!name || !phone) return;
    setContactSaving(true);
    try {
      await fetch('/api/v1/support/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, phone, subject: 'AI Yordamchi orqali murojaat', message: `${name} AI Yordamchi bilan suhbatni boshladi.`, source: 'AI_ASSISTANT' }),
      });
    } catch {
      // Even if the lead couldn't be saved, still let them use the FAQ — it never depends on this.
    }
    const next = { name, phone };
    setContact(next);
    setContactSaving(false);
    try {
      localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Not fatal — just means we'll ask again next visit.
    }
  }

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const match = findAnswer(trimmed);
    setMessages((current) => [
      ...current,
      { role: 'user', text: trimmed },
      match
        ? { role: 'assistant', text: match.answer, href: match.href, linkLabel: match.linkLabel }
        : { role: 'assistant', text: 'Bu savolga aniq javob topa olmadim. Xabaringizni yozib qoldiring — ko‘rsatgan raqamingizga jamoamiz qo‘ng‘iroq qiladi.', href: '/contact', linkLabel: 'Bog‘lanish' },
    ]);
    setInput('');
  }

  return (
    <div className="fixed bottom-20 right-4 z-[60] md:bottom-6">
      {open ? (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(20,40,55,.25)]">
          <div className="flex items-center justify-between bg-[#152a3b] px-4 py-3 text-white">
            <p className="flex items-center gap-2 text-sm font-black"><Sparkles className="size-4 text-orange-300" /> AI Yordamchi</p>
            <button onClick={() => setOpen(false)} aria-label="Yopish" className="rounded-full p-1 hover:bg-white/10"><X className="size-4" /></button>
          </div>

          {!contact ? (
            <form action={submitContact} className="flex flex-1 flex-col justify-center gap-3 p-5">
              <p className="text-sm font-bold text-[#152a3b]">Suhbatni boshlashdan oldin tanishib olaylik</p>
              <p className="text-xs text-slate-500">Ism va telefon raqamingiz kerak bo‘lsa jamoamiz siz bilan bog‘lanishi uchun ishlatiladi.</p>
              <input required name="name" minLength={2} maxLength={120} placeholder="Ismingiz" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
              <input required name="phone" pattern="\+998\d{9}" defaultValue="+998" placeholder="+998901234567" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
              <button disabled={contactSaving} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-60">
                {contactSaving ? <LoaderCircle className="size-4 animate-spin" /> : null} Suhbatni boshlash
              </button>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <div key={index} className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white' : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-[#152a3b]'}>
                    <p>{message.text}</p>
                    {message.href ? <a href={message.href} className="mt-1 flex items-center gap-1 text-xs font-bold text-primary">{message.linkLabel ?? 'Batafsil'} <ArrowRight className="size-3" /></a> : null}
                  </div>
                ))}
                {messages.length <= 1 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {suggestions.map((entry) => (
                      <button key={entry.question} onClick={() => ask(entry.question)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary">
                        {entry.question}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <form action={() => ask(input)} className="flex items-center gap-2 border-t border-slate-100 p-3">
                <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Savolingizni yozing…" className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                <button type="submit" aria-label="Yuborish" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white"><Send className="size-4" /></button>
              </form>
            </>
          )}
        </div>
      ) : null}
      <button
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex items-center gap-2 rounded-full bg-[#152a3b] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_40px_rgba(18,43,61,.35)] transition hover:bg-[#1c374c]"
        aria-expanded={open}
      >
        <MessageCircleQuestion className="size-5 text-orange-300" /> {open ? 'Yopish' : 'Yordamchi'}
      </button>
    </div>
  );
}
