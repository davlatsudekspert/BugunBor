import type { Metadata } from 'next';

import { ContactForm } from '@/components/site/contact-form';
import { formatPhone } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { getCurrentUser } from '@/modules/auth/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.footer.contact, description: t.contact.text, alternates: { canonical: '/contact' } };
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const [{ subject }, { t }, user] = await Promise.all([searchParams, getI18n(), getCurrentUser()]);
  return (
    <main className="grid place-items-center bg-sand px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 sm:p-8">
        <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{t.contact.title}</h1>
        <p className="mt-3 leading-7 text-slate-600">{t.contact.text}</p>
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
      </section>
    </main>
  );
}
