import type { Metadata } from 'next';

import { ActionButton } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { formatMoment } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { parseDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { listMessages } from '@/modules/admin/service';
import { requireModerator } from '@/modules/auth/current';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.messages.title, robots: { index: false, follow: false } };
}

const tone: Record<string, string> = { NEW: 'bg-primary text-white', READ: 'bg-slate-100 text-slate-600', ARCHIVED: 'bg-slate-100 text-slate-400' };

export default async function AdminMessagesPage() {
  const user = await requireModerator('/admin/messages');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const messages = await listMessages(db, null);
  const m = t.admin.messages;
  return (
    <AdminShell t={t} role={user.role} active="messages">
      {messages.length ? (
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={message.id} className={cn('rounded-2xl border bg-white p-5', message.status === 'NEW' ? 'border-primary/40' : 'border-slate-200')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-navy">{message.subject}</p>
                  <p className="text-xs text-slate-500">{message.name} · {message.contact} · {formatMoment(parseDbTime(message.createdAt), t, locale)}</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', tone[message.status])}>{m.status[message.status as keyof typeof m.status]}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{message.message}</p>
              <div className="mt-4 flex gap-2">
                {message.status === 'NEW' ? <ActionButton payload={{ type: 'message.status', messageId: message.id, status: 'READ' }} label={m.markRead} networkError={t.common.networkError} /> : null}
                {message.status !== 'ARCHIVED' ? <ActionButton payload={{ type: 'message.status', messageId: message.id, status: 'ARCHIVED' }} label={m.archive} networkError={t.common.networkError} /> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{m.empty}</p>
      )}
    </AdminShell>
  );
}
