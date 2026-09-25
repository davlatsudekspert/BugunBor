import { ClipboardList, CreditCard, Inbox, LayoutDashboard, Settings, ShieldCheck, Star, Store, Tags, Tag, Users } from 'lucide-react';

import type { Dictionary } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type AdminTab = 'overview' | 'businesses' | 'deals' | 'reviews' | 'users' | 'categories' | 'messages' | 'audit' | 'billing' | 'settings';

const tabs: Array<{ key: AdminTab; href: string; adminOnly: boolean; icon: typeof LayoutDashboard }> = [
  { key: 'overview', href: '/admin', adminOnly: false, icon: LayoutDashboard },
  { key: 'businesses', href: '/admin/businesses', adminOnly: false, icon: Store },
  { key: 'deals', href: '/admin/deals', adminOnly: false, icon: Tag },
  { key: 'reviews', href: '/admin/reviews', adminOnly: false, icon: Star },
  { key: 'messages', href: '/admin/messages', adminOnly: false, icon: Inbox },
  { key: 'billing', href: '/admin/billing', adminOnly: true, icon: CreditCard },
  { key: 'users', href: '/admin/users', adminOnly: true, icon: Users },
  { key: 'categories', href: '/admin/categories', adminOnly: true, icon: Tags },
  { key: 'audit', href: '/admin/audit', adminOnly: false, icon: ClipboardList },
  { key: 'settings', href: '/admin/settings', adminOnly: true, icon: Settings },
];

export function AdminShell({ t, role, active, children }: { t: Dictionary; role: string; active: AdminTab; children: React.ReactNode }) {
  return (
    <main className="min-h-[70vh] bg-slate-50/60 pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-[-.04em] text-navy"><ShieldCheck className="size-7 text-emerald-600" aria-hidden /> {t.admin.title}</h1>
          <nav className="scrollbar-none -mx-4 mt-5 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={t.admin.title}>
            {tabs.filter((tab) => role === 'ADMIN' || !tab.adminOnly).map(({ key, href, icon: Icon }) => (
              <a key={key} href={href} aria-current={active === key ? 'page' : undefined} className={cn('inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition', active === key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-navy')}>
                <Icon className="size-4" aria-hidden /> {t.admin.nav[key]}
              </a>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">{children}</div>
    </main>
  );
}
