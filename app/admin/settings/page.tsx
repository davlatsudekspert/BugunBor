import type { Metadata } from 'next';
import { Bot, CheckCircle2, CircleAlert, FlaskConical } from 'lucide-react';

import { ActionButton } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { getConfig, isTelegramConfigured } from '@/lib/env';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { requireAdmin } from '@/modules/auth/current';
import { createTelegramApi, type WebhookInfo } from '@/modules/telegram/api';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.settings.title, robots: { index: false, follow: false } };
}

export default async function AdminSettingsPage() {
  const user = await requireAdmin('/admin/settings');
  const { t } = await getI18n();
  const config = getConfig();
  const configured = isTelegramConfigured(config);
  const s = t.admin.settings;
  let info: WebhookInfo | null = null;
  let infoError = '';
  if (configured) {
    try {
      info = await createTelegramApi(config.telegram.botToken!).getWebhookInfo();
    } catch (error) {
      infoError = error instanceof Error ? error.message : 'unknown';
    }
  }

  return (
    <AdminShell t={t} role={user.role} active="settings">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><Bot className="size-5 text-[#229ED9]" aria-hidden /> {s.telegram}</h2>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          {configured ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <CircleAlert className="size-4 text-amber-600" aria-hidden />}
          {configured ? s.configured : s.notConfigured}
          {config.telegram.botUsername ? <span className="text-slate-500">· {s.botUsername}: @{config.telegram.botUsername}</span> : null}
        </p>
        {configured ? (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-navy">{s.webhookInfo}:</span> {info?.url || '—'}</p>
            {info ? <p>{fmt(s.pending, { count: info.pending_update_count })}</p> : null}
            {info?.last_error_message ? <p className="text-red-600">{fmt(s.lastError, { error: info.last_error_message })}</p> : null}
            {infoError ? <p className="text-red-600">{infoError}</p> : null}
            <ActionButton payload={{ type: 'telegram.webhook' }} label={s.setWebhook} tone="success" networkError={t.common.networkError} />
          </div>
        ) : null}
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">{s.envHelp}</p>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><FlaskConical className="size-5 text-amber-600" aria-hidden /> {s.demoMode}</h2>
        <p className="mt-2 text-sm text-slate-600">{config.demoMode ? s.demoOn : s.demoOff}</p>
      </section>
    </AdminShell>
  );
}
