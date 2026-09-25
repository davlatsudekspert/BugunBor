import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { LanguageSwitch } from './language-switch';
import { Logo } from './logo';

export async function SiteFooter() {
  const { t, locale } = await getI18n();
  const columns = [
    { title: t.footer.product, links: [{ href: '/discover', label: t.nav.deals }, { href: '/categories', label: t.nav.categories }, { href: '/business', label: t.nav.forBusiness }] },
    { title: t.footer.help, links: [{ href: '/how-it-works', label: t.footer.howItWorks }, { href: '/faq', label: t.footer.faq }, { href: '/contact', label: t.footer.contact }] },
    { title: t.footer.legal, links: [{ href: '/terms', label: t.footer.terms }, { href: '/privacy', label: t.footer.privacy }] },
  ];
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_2fr] lg:px-8">
        <div className="max-w-sm">
          <Logo label={t.nav.homeAria} />
          <p className="mt-4 text-sm leading-6 text-slate-500">{t.footer.tagline}</p>
          <LanguageSwitch locale={locale} label={t.nav.switchTo} full className="mt-4 -ml-3" />
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
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-400 sm:px-6 lg:px-8">{fmt(t.footer.rights, { year: new Date().getUTCFullYear() })}</p>
      </div>
    </footer>
  );
}
