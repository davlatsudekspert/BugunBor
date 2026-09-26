import type { Metadata } from 'next';

import { ActionButton } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { formatMoment } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { requireModerator } from '@/modules/auth/current';
import { listReports } from '@/modules/reports';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.reports.title, robots: { index: false, follow: false } };
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const user = await requireModerator('/admin/reports');
  const [{ f }, { t, locale }, db] = await Promise.all([searchParams, getI18n(), getDb()]);
  const all = f === 'all';
  const reports = await listReports(db, { status: all ? 'ALL' : 'NEW' });
  const r = t.reports;
  return (
    <AdminShell t={t} role={user.role} active="reports">
      <div className="mb-4 flex gap-2 text-sm font-bold">
        <a href="/admin/reports" className={cn('rounded-full px-4 py-2', all ? 'bg-white text-slate-600' : 'bg-navy text-white')}>{r.filterNew}</a>
        <a href="/admin/reports?f=all" className={cn('rounded-full px-4 py-2', all ? 'bg-navy text-white' : 'bg-white text-slate-600')}>{r.filterAll}</a>
      </div>
      {reports.length ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className={cn('rounded-2xl border border-slate-200 bg-white p-5', report.status !== 'NEW' && 'opacity-70')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{r.targets[report.targetType]} · {r.status[report.status as keyof typeof r.status] ?? report.status}</p>
                  {report.link ? <a href={report.link} className="font-black text-navy hover:text-primary">{report.title || '—'}</a> : <p className="font-black text-navy">{report.title || '—'}</p>}
                  <p className="text-xs text-slate-500">{fmt(r.by, { name: report.reporter ?? '—' })} · {formatMoment(parseDbTime(report.createdAt), t, locale)} · {fmt(r.count, { count: report.count })}</p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">{r.reasons[report.reason]}</span>
              </div>
              {report.comment ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{report.comment}</p> : null}
              {report.status === 'NEW' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton payload={{ type: 'report.resolve', reportId: report.id, status: 'RESOLVED' }} label={r.resolve} networkError={t.common.networkError} />
                  <ActionButton payload={{ type: 'report.resolve', reportId: report.id, status: 'DISMISSED' }} label={r.dismiss} tone="danger" networkError={t.common.networkError} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{r.empty}</p>
      )}
    </AdminShell>
  );
}
