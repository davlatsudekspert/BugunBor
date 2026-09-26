import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { DevLogin } from '@/components/account/dev-login';
import { TelegramLogin } from '@/components/account/telegram-login';
import { DEMO_USERS } from '@/db/seed';
import { isTelegramConfigured } from '@/lib/env';
import { safeReturnPath } from '@/lib/http';
import { getI18n } from '@/lib/i18n/server';
import { getCurrentUser } from '@/modules/auth/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.login.title, robots: { index: false, follow: false } };
}

const demoRoles: Record<string, 'CUSTOMER' | 'OWNER' | 'CASHIER' | 'MODERATOR' | 'ADMIN'> = {
  usr_customer_demo: 'CUSTOMER',
  usr_owner_demo: 'OWNER',
  usr_cashier_demo: 'CASHIER',
  usr_moderator_demo: 'MODERATOR',
  usr_admin_demo: 'ADMIN',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const target = safeReturnPath(returnTo, '/account');
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  if (user) redirect(target);

  // "{privacy} va {terms}ga roziman" → the two placeholders become links (opened in a new tab so the login is not lost).
  const links = new Map([
    ['{privacy}', { href: '/privacy', label: t.login.privacyLink }],
    ['{terms}', { href: '/terms', label: t.login.termsLink }],
  ]);
  const consent = t.login.consent.split(/(\{privacy\}|\{terms\})/).map((part, index) => {
    const link = links.get(part);
    return link ? <a key={index} href={link.href} target="_blank" rel="noreferrer" className="font-semibold text-[#1b8cc2] underline underline-offset-2">{link.label}</a> : part;
  });

  return (
    <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-sand px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(20,40,55,.12)]">
        <h1 className="text-3xl font-black tracking-[-.04em] text-navy">{t.login.title}</h1>
        <p className="mt-3 leading-7 text-slate-600">{t.login.text}</p>
        <ol className="mt-5 space-y-2.5 text-sm text-slate-700">
          {t.login.steps.map((step, index) => (
            <li key={step} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</span>{step}</li>
          ))}
        </ol>
        <div className="mt-6">
          {isTelegramConfigured() ? (
            <TelegramLogin
              returnTo={target}
              consent={consent}
              labels={{
                button: t.login.button,
                matchCode: t.login.matchCode,
                matchHint: t.login.matchHint,
                openTelegram: t.login.openTelegram,
                qrHint: t.login.qrHint,
                waiting: t.login.waiting,
                approved: t.login.approved,
                expired: t.login.expired,
                denied: t.login.denied,
                restart: t.login.restart,
                networkError: t.common.networkError,
                consentHint: t.login.consentHint,
              }}
            />
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">{t.login.notConfigured}</p>
          )}
        </div>
        {import.meta.env.DEV ? (
          <DevLogin
            title={t.login.devTitle}
            text={t.login.devText}
            returnTo={target}
            users={DEMO_USERS.map((demo) => ({ id: demo.id, name: demo.name, role: t.login.roles[demoRoles[demo.id]] }))}
          />
        ) : null}
      </section>
    </main>
  );
}
