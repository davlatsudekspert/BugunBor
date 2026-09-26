import { getDb } from '@/db/client';
import { formatPhone } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { appStores } from '@/modules/app-stores';
import { EMPTY_COMPANY, companyIdentifier, getCompanyInfo } from '@/modules/company';
import { AppBadges } from './app-badges';
import { LanguageSwitch } from './language-switch';
import { Logo } from './logo';
import { STOCK_PHOTOS } from '@/lib/stock-photos';

export async function SiteFooter() {
  const { t, locale } = await getI18n();
  // The operator's details, once an admin has entered them, and the app's
  // store links (a missing database never breaks the footer).
  const db = await getDb().catch(() => null);
  const [company, stores] = await Promise.all([
    db ? getCompanyInfo(db).catch(() => EMPTY_COMPANY) : EMPTY_COMPANY,
    db ? appStores(db) : ({ mode: 'off', android: null } as const),
  ]);
  const columns = [
    { title: t.footer.product, links: [{ href: '/discover', label: t.nav.deals }, { href: '/categories', label: t.nav.categories }, { href: '/business', label: t.nav.forBusiness }] },
    { title: t.footer.help, links: [{ href: '/how-it-works', label: t.footer.howItWorks }, { href: '/faq', label: t.footer.faq }, { href: '/contact', label: t.footer.contact }] },
    {
      title: t.footer.legal,
      links: [
        { href: '/terms', label: t.footer.terms },
        { href: '/privacy', label: t.footer.privacy },
        { href: '/oferta', label: t.footer.offer },
        ...(Object.keys(STOCK_PHOTOS).length ? [{ href: '/credits', label: t.footer.credits }] : []),
      ],
    },
  ];
  return (
    <footer className="border-t border-slate-200 bg-white print:hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_2fr] lg:px-8">
        <div className="max-w-sm">
          <Logo label={t.nav.homeAria} />
          <p className="mt-4 text-sm leading-6 text-slate-500">{t.footer.tagline}</p>
          <LanguageSwitch locale={locale} label={t.nav.switchTo} full className="mt-4 -ml-3" />
          <h2 className="mt-6 text-xs font-black uppercase tracking-[.14em] text-slate-400">{t.appStores.footerTitle}</h2>
          <AppBadges stores={stores} t={t} className="mt-3" />
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-xs font-black uppercase tracking-[.14em] text-slate-400">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}><a href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-primary">{link.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-slate-400 sm:px-6 lg:px-8">
          <p>{fmt(t.footer.rights, { year: new Date().getUTCFullYear() })}</p>
          {company.legalName ? (
            <p>
              {company.legalName}
              {company.tin || company.registration ? ` · ${companyIdentifier(company, t.contact.tin)}` : ''}
              {company.address ? ` · ${company.address}` : ''}
              {company.phone ? <> · <a href={`tel:${company.phone}`} className="hover:text-primary">{formatPhone(company.phone)}</a></> : null}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
