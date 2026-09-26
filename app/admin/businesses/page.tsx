import type { Metadata } from 'next';
import { Search } from 'lucide-react';

import { ActionButton, DecisionForm } from '@/components/admin/admin-controls';
import { AdminShell } from '@/components/admin/admin-shell';
import { getDb } from '@/db/client';
import { cityName } from '@/lib/cities';
import { formatDay, formatPhone } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { formatNumericDate, parseDbTime, toDbTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { listAdminBusinesses, type AdminListFilter } from '@/modules/admin/service';
import { requireModerator } from '@/modules/auth/current';
import { getBillingSettings } from '@/modules/billing/service';
import { flagText, parseFlags } from '@/modules/moderation/auto';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.businesses.title, robots: { index: false, follow: false } };
}

const statusTone: Record<string, string> = { PENDING: 'bg-amber-50 text-amber-700', VERIFIED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-700' };

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f, q } = await searchParams;
  const user = await requireModerator('/admin/businesses');
  const [{ t, locale }, db] = await Promise.all([getI18n(), getDb()]);
  const filter: AdminListFilter = f === 'all' || f === 'auto' ? f : 'pending';
  const [businesses, billing] = await Promise.all([listAdminBusinesses(db, { list: filter, query: q }), getBillingSettings(db)]);
  const isAdmin = user.role === 'ADMIN';
  const a = t.admin;
  const nowDb = toDbTime(new Date());

  return (
    <AdminShell t={t} role={user.role} active="businesses">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['pending', 'auto', 'all'] as const).map((key) => (
            <a key={key} href={key === 'pending' ? '/admin/businesses' : `/admin/businesses?f=${key}`} className={cn('inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold', filter === key ? 'border-navy bg-navy text-white' : 'border-slate-200 bg-white text-slate-600')}>{key === 'auto' ? a.auto.filter : a.filters[key]}</a>
          ))}
        </div>
        <form className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search className="size-4 text-slate-400" aria-hidden />
          <input type="hidden" name="f" value={filter} />
          <input name="q" defaultValue={q} placeholder={t.common.search} aria-label={t.common.search} className="w-48 bg-transparent text-sm outline-none" />
        </form>
      </div>

      {businesses.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {businesses.map((business) => {
            const onAir = (business.trialEndsAt && business.trialEndsAt > nowDb) || (business.paidUntil && business.paidUntil > nowDb);
            return (
              <article key={business.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-navy">{business.name}</p>
                    <p className="text-xs text-slate-500">{business.categoryName} · {cityName(business.city, locale)} · {formatDay(parseDbTime(business.createdAt), t, locale)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', statusTone[business.verificationStatus] ?? 'bg-slate-100 text-slate-600')}>{a.businesses.status[business.verificationStatus as keyof typeof a.businesses.status] ?? business.verificationStatus}</span>
                    {business.autoDecided && business.verificationStatus === 'VERIFIED' ? <span title={a.auto.badgeHint} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{a.auto.badge}</span> : null}
                    {business.suspendedAt ? <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">{a.businesses.suspended}</span> : null}
                    {business.isDemo ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{t.common.demo}</span> : null}
                  </div>
                </div>
                {business.logoId || business.coverId ? (
                  <div className="mt-3 flex items-center gap-2">
                    {business.logoId ? <img src={`/media/${business.logoId}`} alt="" className="size-14 rounded-xl object-cover ring-1 ring-slate-200" /> : null}
                    {business.coverId ? <img src={`/media/${business.coverId}`} alt="" className="h-14 w-24 rounded-xl object-cover ring-1 ring-slate-200" /> : null}
                  </div>
                ) : null}
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{business.description}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><dt className="text-slate-400">{a.businesses.owner}</dt><dd className="font-semibold text-navy">{business.ownerName ?? '—'} {business.ownerPhone ? `· ${formatPhone(business.ownerPhone)}` : ''}</dd></div>
                  <div><dt className="text-slate-400">{t.businessForm.phone}</dt><dd className="font-semibold text-navy">{formatPhone(business.phone)}</dd></div>
                  <div><dt className="text-slate-400">{t.biz.nav.branches} / {t.biz.nav.deals}</dt><dd className="font-semibold text-navy">{business.branchCount} / {business.dealCount}</dd></div>
                  <div>
                    <dt className="text-slate-400">{a.billing.subscription}</dt>
                    <dd className={cn('font-semibold', onAir || (!billing.tariffsEnabled && business.verificationStatus === 'VERIFIED') ? 'text-emerald-700' : 'text-slate-500')}>
                      {!billing.tariffsEnabled && business.verificationStatus === 'VERIFIED' && !(business.paidUntil && business.paidUntil > nowDb)
                        ? t.billing.status.FREE
                        : business.paidUntil && business.paidUntil > nowDb
                        ? `${business.planCode} · ${fmt(a.billing.until, { date: formatNumericDate(parseDbTime(business.paidUntil)) })}`
                        : business.trialEndsAt
                          ? `${t.billing.status.TRIAL} · ${fmt(a.billing.until, { date: formatNumericDate(parseDbTime(business.trialEndsAt)) })}`
                          : '—'}
                    </dd>
                  </div>
                </dl>
                {business.rejectionReason && business.verificationStatus === 'REJECTED' ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{business.rejectionReason}</p> : null}
                {business.suspendedReason ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{business.suspendedReason}</p> : null}

                {business.verificationStatus === 'PENDING' && parseFlags(business.autoNote).length ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{fmt(a.auto.held, { reasons: flagText(parseFlags(business.autoNote), t) })}</p>
                ) : business.verificationStatus === 'PENDING' && business.autoNote === '' ? (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{a.auto.clean}</p>
                ) : null}
                {business.verificationStatus === 'PENDING' ? (
                  <DecisionForm kind="business" targetId={business.id} labels={{ approve: a.approve, reject: a.reject, reason: a.reason, placeholder: a.reasonPlaceholder, hint: a.reasonHint, networkError: t.common.networkError }} />
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {business.verificationStatus === 'VERIFIED' ? <a href={`/businesses/${business.slug}`} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-navy">{t.biz.viewPublic}</a> : null}
                  {business.logoId || business.coverId ? (
                    <ActionButton payload={{ type: 'images.remove', target: 'BUSINESS', id: business.id }} label={a.removeImages} reasonPrompt={a.removeImagesReason} tone="danger" networkError={t.common.networkError} />
                  ) : null}
                  {isAdmin ? (
                    <>
                      {[1, 2, 3].map((months) => (
                        <ActionButton key={months} payload={{ type: 'business.trial', businessId: business.id, months }} label={fmt(a.billing.grantTrial, { count: months })} tone="success" networkError={t.common.networkError} />
                      ))}
                      {business.suspendedAt ? (
                        <ActionButton payload={{ type: 'business.suspend', businessId: business.id, suspended: false, reason: '' }} label={a.businesses.unsuspend} networkError={t.common.networkError} />
                      ) : (
                        <ActionButton payload={{ type: 'business.suspend', businessId: business.id, suspended: true }} label={a.businesses.suspend} reasonPrompt={a.businesses.suspendReason} tone="danger" networkError={t.common.networkError} />
                      )}
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{a.queueEmpty}</p>
      )}
    </AdminShell>
  );
}
