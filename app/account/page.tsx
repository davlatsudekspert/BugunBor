import type { Metadata } from 'next';
import { ArrowRight, Heart, LayoutDashboard, PiggyBank, PlusCircle, ShieldCheck, TicketCheck } from 'lucide-react';

import { DeleteAccountButton, LogoutButton, NameForm } from '@/components/account/account-actions';
import { NotificationSettings } from '@/components/account/notification-settings';
import { LanguageSwitch } from '@/components/site/language-switch';
import { getDb } from '@/db/client';
import { formatPhone, formatSum, initials } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { accountStats, getNotificationSettings } from '@/modules/auth/account';
import { isModerator, requireUser } from '@/modules/auth/current';
import { listMemberships } from '@/modules/businesses/access';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.title, robots: { index: false, follow: false } };
}

export default async function AccountPage() {
  const user = await requireUser('/account');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const [stats, memberships, notifications] = await Promise.all([accountStats(db, user.id), listMemberships(db, user.id), getNotificationSettings(db, user.id)]);

  const links = [
    { href: '/account/codes', label: t.account.sections.codes, icon: TicketCheck, badge: stats.active ? String(stats.active) : null },
    { href: '/account/saved', label: t.account.sections.saved, icon: Heart, badge: null },
    memberships.length
      ? { href: '/business/dashboard', label: t.account.sections.business, icon: LayoutDashboard, badge: null }
      : { href: '/business/onboarding', label: t.account.sections.addBusiness, icon: PlusCircle, badge: null },
    ...(isModerator(user) ? [{ href: '/admin', label: t.account.sections.admin, icon: ShieldCheck, badge: null }] : []),
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-navy text-xl font-black text-white">{initials(user.displayName) || 'B'}</span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-black tracking-[-.04em] text-navy">{fmt(t.account.hello, { name: user.displayName })}</h1>
          {user.phone ? <p className="mt-1 text-sm text-slate-500">{t.account.phone}: {formatPhone(user.phone)}</p> : null}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white shadow-[0_18px_50px_rgba(16,120,80,.25)]">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-50"><PiggyBank className="size-5" aria-hidden /> {t.account.stats.saved}</p>
        <p className="mt-2 text-2xl font-black tracking-[-.03em] sm:text-3xl">
          {stats.savedUzs > 0 ? fmt(t.account.savedBanner, { sum: formatSum(stats.savedUzs, t) }) : t.account.savedBannerEmpty}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: t.account.stats.active, value: String(stats.active) },
          { label: t.account.stats.redeemed, value: String(stats.redeemed) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
            <dd className="mt-2 text-lg font-black text-navy sm:text-2xl">{item.value}</dd>
          </div>
        ))}
      </dl>

      <nav className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {links.map(({ href, label, icon: Icon, badge }) => (
          <a key={href} href={href} className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 font-bold text-navy last:border-b-0 hover:bg-slate-50">
            <span className="flex items-center gap-3"><Icon className="size-5 text-primary" aria-hidden /> {label}</span>
            <span className="flex items-center gap-2">
              {badge ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{badge}</span> : null}
              <ArrowRight className="size-4 text-slate-400" aria-hidden />
            </span>
          </a>
        ))}
      </nav>

      <div className="mt-6">
        <NotificationSettings
          initial={notifications}
          labels={{ title: t.account.notifications, hint: t.account.notificationsHint, deals: t.account.notifyDeals, reminders: t.account.notifyReminders, networkError: t.common.networkError }}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <NameForm initial={user.displayName} labels={{ name: t.account.name, placeholder: t.account.namePlaceholder, save: t.account.saveName, saved: t.common.saved, error: t.common.unknownError }} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            {t.account.language}: <LanguageSwitch locale={locale} label={t.nav.switchTo} full />
          </div>
          <LogoutButton label={t.account.logout} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-red-100 bg-white p-5">
        <h2 className="text-sm font-black uppercase tracking-[.12em] text-red-600">{t.account.danger}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t.account.deleteText}</p>
        <div className="mt-4">
          <DeleteAccountButton labels={{ button: t.account.deleteTitle, ask: t.account.deleteAsk, error: t.common.unknownError, closeAndDelete: t.account.closeAndDelete, closeAsk: t.account.closeAsk }} />
        </div>
      </section>
    </main>
  );
}
