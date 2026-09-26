import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { formatMoment } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { listAudit } from '@/modules/admin/service';
import { requireModerator } from '@/modules/auth/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.audit.title, robots: { index: false, follow: false } };
}

export default async function AdminAuditPage() {
  const user = await requireModerator('/admin/audit');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const rows = await listAudit(db);
  const a = t.admin.audit;
  return (
    <AdminShell t={t} role={user.role} active="audit">
      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">{t.common.date}</th><th className="px-4 py-3">{a.actor}</th><th className="px-4 py-3">{a.action}</th><th className="px-4 py-3">{a.target}</th><th className="px-4 py-3">{t.admin.reason}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatMoment(parseDbTime(row.createdAt), t, locale)}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{row.actorName ?? 'system'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-navy">{row.action}</td>
                  <td className="px-4 py-3 text-slate-600">{row.businessName ? `${row.businessName} · ` : ''}{row.targetType}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{row.reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{a.empty}</p>
      )}
    </AdminShell>
  );
}
