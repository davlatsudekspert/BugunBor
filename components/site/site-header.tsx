import { LayoutDashboard, ShieldCheck } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { getDb } from '@/db/client';
import { initials } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import { getCurrentUser, isModerator } from '@/modules/auth/current';
import { listMemberships } from '@/modules/businesses/access';
import { LanguageSwitch } from './language-switch';
import { Logo } from './logo';

export async function SiteHeader() {
  const [{ t, locale }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const memberships = user ? await listMemberships(await getDb(), user.id) : [];
  const postDealHref = memberships.some((membership) => membership.role !== 'CASHIER') ? '/business/deals/new' : '/business/onboarding';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-cream/90 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Logo label={t.nav.homeAria} />

        <nav className="hidden items-center gap-5 whitespace-nowrap text-sm font-semibold text-slate-600 md:flex lg:gap-7" aria-label={t.nav.main}>
          <a className="transition-colors hover:text-primary" href="/discover">{t.nav.deals}</a>
          <a className="transition-colors hover:text-primary" href="/categories">{t.nav.categories}</a>
          <a className="transition-colors hover:text-primary" href="/business">{t.nav.forBusiness}</a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitch locale={locale} label={t.nav.switchTo} />
          {isModerator(user) ? (
            <a href="/admin" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-100 lg:inline-flex">
              <ShieldCheck className="size-4 text-emerald-600" aria-hidden /> {t.nav.admin}
            </a>
          ) : null}
          {memberships.length ? (
            <a href="/business/dashboard" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-100 lg:inline-flex">
              <LayoutDashboard className="size-4 text-primary" aria-hidden /> {t.nav.myBusiness}
            </a>
          ) : null}
          {user ? (
            <a href="/account" className="hidden items-center gap-2 rounded-xl py-1 pl-1 pr-3 text-sm font-bold text-navy hover:bg-slate-100 sm:inline-flex" aria-label={t.nav.account}>
              {user.avatar ? (
                <img src={user.avatar} alt="" className="size-8 rounded-full object-cover" />
              ) : (
                <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-black text-white">{initials(user.displayName) || 'B'}</span>
              )}
              <span className="hidden max-w-32 truncate lg:inline">{user.displayName}</span>
            </a>
          ) : (
            <a className={cn(buttonVariants({ variant: 'ghost' }), 'hidden h-10 sm:inline-flex')} href="/login">{t.nav.login}</a>
          )}
          <a className={cn(buttonVariants(), 'h-10 rounded-xl px-3 font-bold shadow-[0_6px_16px_rgba(245,89,55,.18)] sm:px-4')} href={postDealHref} aria-label={t.nav.postDeal}>
            <span className="sm:hidden">{t.nav.postDealShort}</span>
            <span className="hidden sm:inline">{t.nav.postDeal}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
