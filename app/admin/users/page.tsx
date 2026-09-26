import type { Metadata } from 'next';
import { Search } from 'lucide-react';

import { UserControls } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { formatDay, formatPhone } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { listAdminUsers } from '@/modules/admin/service';
import { requireAdmin } from '@/modules/auth/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.users.title, robots: { index: false, follow: false } };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await requireAdmin('/admin/users');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const users = await listAdminUsers(db, q ?? null);
  const u = t.admin.users;
  return (
    <AdminShell t={t} role={user.role} active="users">
      <form className="flex h-11 max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
        <Search className="size-4 text-slate-400" aria-hidden />
        <input name="q" defaultValue={q} placeholder={u.search} aria-label={u.search} className="flex-1 bg-transparent text-sm outline-none" />
      </form>
      <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {users.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-bold text-navy">{item.displayName} {item.id === user.id ? <span className="text-xs text-slate-400">({u.self})</span> : null}</p>
              <p className="text-xs text-slate-500">
                {formatPhone(item.phone) || '—'} · {u.joined}: {formatDay(parseDbTime(item.createdAt), t, locale)}
                {item.businesses ? ` · ${t.nav.myBusiness}: ${item.businesses}` : ''}
              </p>
              <p className="mt-1 flex gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{u.roles[item.role]}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', item.status === 'BLOCKED' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>{u.status[item.status]}</span>
              </p>
            </div>
            {item.id !== user.id ? (
              <UserControls userId={item.id} role={item.role} status={item.status} labels={{ roles: u.roles, setRole: u.setRole, block: u.block, unblock: u.unblock, networkError: t.common.networkError }} />
            ) : null}
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
