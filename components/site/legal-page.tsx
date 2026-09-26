import { fmt, type Dictionary } from '@/lib/i18n';

export function LegalPage({ title, sections, t }: { title: string; sections: readonly { title: string; text: string }[]; t: Dictionary }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{title}</h1>
      <p className="mt-3 text-sm text-slate-500">{fmt(t.legal.updated, { date: '25.09.2026' })}</p>
      <div className="mt-8 space-y-6">
        {sections.map((section, index) => (
          <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-black text-navy">{index + 1}. {section.title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{section.text}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
