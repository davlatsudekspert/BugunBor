import type { Metadata } from 'next';
import { CheckCircle2, CircleMinus, LogIn } from 'lucide-react';

import { DeleteAccountButton } from '@/components/account/account-actions';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { RETENTION } from '@/lib/retention';
import { getCurrentUser } from '@/modules/auth/current';

// A public page on how to delete an account (app stores ask for such a link).
// Signed-in visitors can delete right here; the rest are sent through login.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.deleteAccount.title, description: t.deleteAccount.intro, alternates: { canonical: '/delete-account' } };
}

export default async function DeleteAccountPage() {
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const d = t.deleteAccount;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-black tracking-[-.05em] text-navy">{d.title}</h1>
      <p className="mt-4 leading-7 text-slate-600">{d.intro}</p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black text-navy">{d.stepsTitle}</h2>
        <ol className="mt-3 space-y-2.5 text-slate-700">
          {d.steps.map((step, index) => (
            <li key={step} className="flex gap-3 leading-6"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</span>{step}</li>
          ))}
        </ol>
        <div className="mt-5 border-t border-slate-100 pt-5">
          {user ? (
            <>
              <p className="mb-3 text-sm font-semibold text-slate-600">{d.signedIn}</p>
              <DeleteAccountButton labels={{ button: t.account.deleteTitle, ask: t.account.deleteAsk, error: t.common.unknownError }} />
            </>
          ) : (
            <a href="/login?returnTo=%2Fdelete-account" className="inline-flex h-11 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-bold text-white hover:bg-navy/90">
              <LogIn className="size-4" aria-hidden /> {d.login}
            </a>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-navy">{d.deletedTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {d.deleted.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" aria-hidden />{item}</li>)}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-navy">{d.keptTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {d.kept.map((item) => <li key={item} className="flex gap-2"><CircleMinus className="mt-1 size-4 shrink-0 text-slate-400" aria-hidden />{fmt(item, { years: RETENTION.logYears })}</li>)}
          </ul>
        </section>
      </div>

      <div className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
        <p>{d.soleOwner}</p>
        <p>{d.noAccess} <a href={`/contact?subject=${encodeURIComponent(d.contactSubject)}`} className="font-bold text-primary underline underline-offset-2">{d.contact}</a></p>
        <p><a href="/privacy#deletion" className="font-bold text-primary underline underline-offset-2">{d.privacy}</a></p>
      </div>
    </main>
  );
}
