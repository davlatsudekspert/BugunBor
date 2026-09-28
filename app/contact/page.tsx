import type { Metadata } from 'next';
import { Clock3, Mail, Phone, Send } from 'lucide-react';

import { ContactForm } from '@/components/site/contact-form';
import { getDb } from '@/db/client';
import { formatPhone } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { localeAlternates } from '@/lib/locale-paths';
import { PRIVACY_DETAILS } from '@/lib/privacy';
import { getCurrentUser } from '@/modules/auth/current';
import { getCompanyInfo } from '@/modules/company';

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t.footer.contact, description: t.contact.text, alternates: localeAlternates('/contact', locale) };
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const [{ subject }, { t }, user, company] = await Promise.all([searchParams, getI18n(), getCurrentUser(), getDb().then(getCompanyInfo)]);
  // Straight to a person, next to the form: Telegram once an admin enters it,
  // the operator's e-mail (the one the privacy policy gives), and when to expect a reply.
  const email = company.email || PRIVACY_DETAILS.email || '';
  const direct = [
    ...(company.telegram ? [{ label: t.contact.telegram, value: `@${company.telegram}`, href: `https://t.me/${company.telegram}`, icon: Send }] : []),
    ...(email ? [{ label: t.contact.email, value: email, href: `mailto:${email}`, icon: Mail }] : []),
    ...(company.phone ? [{ label: t.contact.phone, value: formatPhone(company.phone), href: `tel:${company.phone}`, icon: Phone }] : []),
  ];
  const details = [
    { label: t.contact.legalName, value: company.legalName },
    { label: t.contact.tin, value: company.tin },
    { label: t.contact.registration, value: company.registration },
    { label: t.contact.address, value: company.address },
  ].filter((item) => item.value);
  return (
    <main className="grid place-items-center bg-sand px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 sm:p-8">
        <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{t.contact.title}</h1>
        <p className="mt-3 leading-7 text-slate-600">{t.contact.text}</p>
        <div className="mt-5 rounded-2xl bg-cream p-4">
          <p className="text-sm font-black text-navy">{t.contact.direct}</p>
          <ul className="mt-2 space-y-1">
            {direct.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="flex min-h-11 items-center gap-2.5 text-sm font-bold text-navy hover:text-primary" {...(item.href.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  <item.icon className="size-4 shrink-0 text-primary" aria-hidden /> <span className="text-slate-500">{item.label}:</span> <span className="min-w-0 break-all">{item.value}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-600"><Clock3 className="size-4 shrink-0 text-emerald-600" aria-hidden /> {t.contact.responseTime}</p>
        </div>
        <ContactForm
          defaults={{ name: user?.displayName, contact: user?.phone ? formatPhone(user.phone) : undefined, subject: subject?.slice(0, 160) }}
          labels={{
            name: t.contact.name,
            contact: t.contact.contact,
            subject: t.contact.subject,
            message: t.contact.message,
            messagePlaceholder: t.contact.messagePlaceholder,
            send: t.contact.send,
            sending: t.contact.sending,
            success: t.contact.success,
            error: t.common.unknownError,
          }}
        />
        {details.length ? (
          <dl className="mt-8 grid gap-3 border-t border-slate-100 pt-6 text-sm sm:grid-cols-2">
            {details.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</dt>
                <dd className="mt-0.5 font-semibold text-navy">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>
    </main>
  );
}
