import type { Metadata } from 'next';
import { Bot, Building2, CheckCircle2, CircleAlert, CreditCard, FlaskConical, Sparkles } from 'lucide-react';

import { ActionButton } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { CompanyForm } from '@/components/admin/company-form';
import { getDb } from '@/db/client';
import { DEFAULT_HASH_SECRET, getConfig, isTelegramConfigured } from '@/lib/env';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { requireAdmin } from '@/modules/auth/current';
import { companyComplete, getCompanyInfo } from '@/modules/company';
import { demoEnabled } from '@/modules/demo';
import { getAutoModerationSettings } from '@/modules/moderation/auto';
import { notificationStats } from '@/modules/notifications/service';
import { createTelegramApi, type WebhookInfo } from '@/modules/telegram/api';
import { currentWebhookState } from '@/modules/telegram/setup';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.settings.title, robots: { index: false, follow: false } };
}

export default async function AdminSettingsPage() {
  const user = await requireAdmin('/admin/settings');
  const [{ t }, db] = await Promise.all([getI18n(), getDb()]);
  const [queue, switches, company, demo] = await Promise.all([notificationStats(db), getAutoModerationSettings(db), getCompanyInfo(db, { fresh: true }), demoEnabled(db)]);
  const auto = t.admin.auto;
  const config = getConfig();
  const siteUrl = config.appUrl ?? 'https://bugunbor.uz';
  const configured = isTelegramConfigured(config);
  const s = t.admin.settings;
  let info: WebhookInfo | null = null;
  let infoError = '';
  const connection = configured ? await currentWebhookState(db, config) : null;
  const tokenBot = connection?.username ?? null;
  const mismatch = Boolean(tokenBot && config.telegram.botUsername && tokenBot.toLowerCase() !== config.telegram.botUsername.toLowerCase());
  if (configured) {
    try {
      info = await createTelegramApi(config.telegram.botToken!).getWebhookInfo();
    } catch (error) {
      infoError = error instanceof Error ? error.message : 'unknown';
    }
  }

  return (
    <AdminShell t={t} role={user.role} active="settings">
      {!config.isDevelopment && config.hashSecret === DEFAULT_HASH_SECRET ? (
        <p role="alert" className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {s.hashSecretMissing}
        </p>
      ) : null}
      <section id="automation" className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><Sparkles className="size-5 text-primary" aria-hidden /> {auto.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{auto.settingsText}</p>
        <ul className="mt-4 divide-y divide-slate-100">
          {(['businesses', 'deals', 'reviews'] as const).map((key) => (
            <li key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-sm font-semibold text-navy">{auto[key]}</span>
              <span className="flex items-center gap-2">
                <span className={switches[key] ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700' : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600'}>{switches[key] ? auto.on : auto.off}</span>
                <ActionButton payload={{ type: 'automation.update', key, on: !switches[key] }} label={switches[key] ? auto.turnOff : auto.turnOn} tone={switches[key] ? 'neutral' : 'success'} networkError={t.common.networkError} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">{auto.alerts}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><Bot className="size-5 text-[#229ED9]" aria-hidden /> {s.telegram}</h2>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          {configured ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <CircleAlert className="size-4 text-amber-600" aria-hidden />}
          {configured ? s.configured : s.notConfigured}
          {config.telegram.botUsername ? <span className="text-slate-500">· {s.botUsername}: @{config.telegram.botUsername}</span> : null}
        </p>
        {configured ? (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>{s.autoConnect}</p>
            {tokenBot ? <p><span className="font-semibold text-navy">{s.tokenBot}:</span> @{tokenBot}</p> : null}
            {mismatch ? <p role="alert" className="rounded-xl bg-amber-50 p-3 font-semibold text-amber-800">{fmt(s.botMismatch, { actual: tokenBot ?? '', configured: config.telegram.botUsername ?? '' })}</p> : null}
            {connection?.error ? <p className="text-red-600">{fmt(s.autoConnectError, { error: /unauthorized|not found/i.test(connection.error) ? s.tokenInvalid : connection.error })}</p> : null}
            <p><span className="font-semibold text-navy">{s.webhookInfo}:</span> {info?.url || '—'}</p>
            {info ? <p>{fmt(s.pending, { count: info.pending_update_count })}</p> : null}
            {info?.last_error_message ? <p className="text-red-600">{fmt(s.lastError, { error: info.last_error_message })}</p> : null}
            {infoError ? <p className="text-red-600">{infoError}</p> : null}
            <ActionButton payload={{ type: 'telegram.webhook' }} label={s.setWebhook} tone="success" networkError={t.common.networkError} />
          </div>
        ) : null}
        <p className="mt-4 text-sm font-semibold text-navy">{t.admin.notificationsQueue}</p>
        <p className="mt-1 text-sm text-slate-600">{fmt(t.admin.notificationsStats, { pending: queue.PENDING + queue.SENDING, sent: queue.SENT, skipped: queue.SKIPPED, failed: queue.FAILED })}</p>
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">{s.envHelp}</p>
      </section>

      <section id="payments" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><CreditCard className="size-5 text-primary" aria-hidden /> {s.payments}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
          {config.payments.enabled ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <CircleAlert className="size-4 text-amber-600" aria-hidden />}
          {config.payments.enabled ? s.paymentsOn : s.paymentsOff}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {([['Payme', config.payments.payme], ['Click', config.payments.click]] as const).map(([provider, settings]) => (
            <li key={provider}>{settings ? fmt(s.providerReady, { provider, mode: settings.sandbox ? s.sandbox : s.live }) : fmt(s.providerMissing, { provider })}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-semibold text-navy">{s.cabinetUrls}</p>
        <ul className="mt-1 space-y-1 break-all font-mono text-xs text-slate-600">
          <li>Payme: {siteUrl}/api/v1/payments/payme</li>
          <li>Click Prepare: {siteUrl}/api/v1/payments/click/prepare</li>
          <li>Click Complete: {siteUrl}/api/v1/payments/click/complete</li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">{s.accountField}</p>
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">{s.paymentsHelp}</p>
      </section>

      <section id="company" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><Building2 className="size-5 text-primary" aria-hidden /> {s.company}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{s.companyText}</p>
        <p className={companyComplete(company) ? 'mt-2 text-sm font-semibold text-emerald-700' : 'mt-2 text-sm font-semibold text-amber-700'}>{companyComplete(company) ? s.companyComplete : s.companyIncomplete}</p>
        <CompanyForm
          initial={company}
          labels={{ legalName: s.legalName, tin: s.tin, tinHint: s.tinHint, address: s.address, phone: s.phone, email: s.email, save: s.saveCompany, saved: t.common.saved, networkError: t.common.networkError }}
        />
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-navy"><FlaskConical className="size-5 text-amber-600" aria-hidden /> {s.demoMode}</h2>
        <p className="mt-2 text-sm font-semibold text-navy">{demo ? s.demoOn : s.demoOff}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{s.demoHint}</p>
        <div className="mt-3">
          {config.demoMode ? (
            <p className="text-xs text-slate-500">{s.demoFromEnv}</p>
          ) : (
            <ActionButton payload={{ type: 'demo.update', on: !demo }} label={demo ? s.demoTurnOff : s.demoTurnOn} tone={demo ? 'neutral' : 'success'} networkError={t.common.networkError} />
          )}
        </div>
      </section>
    </AdminShell>
  );
}
