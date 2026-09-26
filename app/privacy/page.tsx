import type { Metadata } from 'next';

import { getI18n } from '@/lib/i18n/server';
import { LANGUAGE_NAMES, PRIVACY_LOCALES, isPrivacyLocale, privacyPolicy, type PrivacyLocale } from '@/lib/privacy';
import { cn } from '@/lib/utils';

type Props = { searchParams: Promise<{ lang?: string }> };

const LANG_ATTR: Record<PrivacyLocale, string> = { uz: 'uz-Latn', ru: 'ru', en: 'en' };

/** ?lang=uz|ru|en picks the language; otherwise the site's own language. */
async function chosenLocale(searchParams: Props['searchParams']): Promise<PrivacyLocale> {
  const { lang } = await searchParams;
  if (isPrivacyLocale(lang)) return lang;
  return (await getI18n()).locale;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const policy = privacyPolicy(await chosenLocale(searchParams));
  return {
    title: policy.title,
    description: policy.intro,
    alternates: { canonical: '/privacy', languages: { 'uz-Latn': '/privacy?lang=uz', ru: '/privacy?lang=ru', en: '/privacy?lang=en' } },
  };
}

/** Highlights the [TO'LDIRISH KERAK: …] markers so unfinished places stand out. */
function Text({ value }: { value: string }) {
  const parts = value.split(/(\[TO'LDIRISH KERAK: [^\]]*\])/);
  return parts.map((part, index) => (index % 2 === 1 ? <mark key={index} className="rounded bg-amber-200 px-1 font-semibold text-amber-950">{part}</mark> : part));
}

export default async function PrivacyPage({ searchParams }: Props) {
  const locale = await chosenLocale(searchParams);
  const policy = privacyPolicy(locale);
  return (
    <main lang={LANG_ATTR[locale]} className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Til · Язык · Language" className="flex flex-wrap gap-2">
        {PRIVACY_LOCALES.map((code) => (
          <a
            key={code}
            href={`/privacy?lang=${code}`}
            hrefLang={LANG_ATTR[code]}
            lang={LANG_ATTR[code]}
            aria-current={code === locale ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 items-center rounded-full border px-4 text-sm font-bold transition',
              code === locale ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary',
            )}
          >
            {LANGUAGE_NAMES[code]}
          </a>
        ))}
      </nav>
      <h1 className="mt-6 text-4xl font-black tracking-[-.05em] text-navy">{policy.title}</h1>
      <p className="mt-3 text-sm text-slate-500">{policy.updated}</p>
      <p className="mt-6 leading-7 text-slate-600">{policy.intro}</p>
      <nav className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" aria-label={policy.contents}>
        <p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">{policy.contents}</p>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {policy.sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="inline-block py-1 font-semibold text-slate-600 hover:text-primary">{index + 1}. {section.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-8 space-y-6">
        {policy.sections.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-black text-navy">{index + 1}. {section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-2 leading-7 text-slate-600"><Text value={paragraph} /></p>)}
            {section.items?.length ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-7 text-slate-600">
                {section.items.map((item) => <li key={item}><Text value={item} /></li>)}
              </ul>
            ) : null}
            {section.after ? <p className="mt-3 leading-7 text-slate-600"><Text value={section.after} /></p> : null}
          </section>
        ))}
      </div>
    </main>
  );
}
