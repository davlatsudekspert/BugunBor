import { BadgeCheck, LayoutDashboard, ShieldCheck, ShoppingBag, Users, Wallet } from 'lucide-react';

import { AdminLogoutButton } from '@/components/admin/admin-logout-button';
import { requireAdminPage } from '@/modules/admin/guard';
import { canAdmin, type AdminRole } from '@/modules/admin/authorization';

const roleLabels = { SUPER_ADMIN: 'Bosh admin', MANAGER: 'Menejer', ACCOUNTANT: 'Hisobchi' } as const;

const navItems: Array<{ href: string; label: string; icon: typeof LayoutDashboard; visible: (role: AdminRole) => boolean }> = [
  { href: '/admin', label: 'Boshqaruv paneli', icon: LayoutDashboard, visible: (role) => canAdmin(role, 'admin.dashboard.read') },
  { href: '/admin/deals', label: 'Aksiyalar moderatsiyasi', icon: ShieldCheck, visible: (role) => canAdmin(role, 'admin.deals.moderate') },
  // Accountants can open Businesses read-only, to assign paid plans, even without moderation rights.
  { href: '/admin/businesses', label: 'Bizneslar', icon: ShoppingBag, visible: (role) => canAdmin(role, 'admin.businesses.manage') || canAdmin(role, 'admin.plans.manage') },
  { href: '/admin/plans', label: 'Rejalar va narxlar', icon: Wallet, visible: (role) => canAdmin(role, 'admin.plans.manage') },
  { href: '/admin/team', label: 'Admin jamoa', icon: Users, visible: (role) => canAdmin(role, 'admin.team.manage') },
];

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const visibleNavItems = navItems.filter((item) => item.visible(admin.role));

  return (
    <div className="min-h-screen bg-slate-50 text-[#152a3b] lg:flex">
      <aside className="border-b border-white/10 bg-[#152a3b] text-white lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-2 px-5">
          <a href="/admin" className="text-lg font-black">Bugun<span className="text-orange-400">Bor</span></a>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-200">Admin</span>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-4 lg:flex-1 lg:pb-0" aria-label="Admin navigatsiyasi">
          {visibleNavItems.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
              <Icon className="size-4 shrink-0" /> {label}
            </a>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm">
            <BadgeCheck className="size-4 shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <p className="truncate font-bold text-white">{admin.displayName}</p>
              <p className="text-xs text-slate-400">{roleLabels[admin.role]}</p>
            </div>
          </div>
          <div className="mt-2">
            <AdminLogoutButton />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
