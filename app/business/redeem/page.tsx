import type { Metadata } from 'next';

import { BookingActions } from '@/components/business/booking-actions';
import { RedeemPanel } from '@/components/business/redeem-panel';
import { WorkspaceShell } from '@/components/business/workspace-shell';
import { formatSum } from '@/lib/format';
import { fmt } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { formatClock, parseDbTime } from '@/lib/time';
import { requireWorkspace } from '@/modules/businesses/current';
import { recentCodes, redeemedToday } from '@/modules/businesses/service';
import { normalizeRedemptionCode } from '@/modules/redemptions/codes';
import { firstValues } from '@/lib/search-params';
import { DELETED_USER_NAME } from '@/modules/auth/account';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.biz.redeem.title, robots: { index: false, follow: false } };
}

export default async function RedeemPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = firstValues(await searchParams);
  const ws = await requireWorkspace(`/business/redeem${code ? `?code=${encodeURIComponent(code)}` : ''}`, 'redemption.validate');
  const { t, db, membership } = ws;
  const [today, bookings] = await Promise.all([redeemedToday(db, membership.businessId), recentCodes(db, membership.businessId, new Date(), { activeOnly: true })]);
  const r = t.biz.redeem;
  const b = t.biz.dashboard.bookings;

  return (
    <WorkspaceShell ws={ws} active="redeem">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section>
          <h2 className="text-2xl font-black tracking-[-.03em] text-navy">{r.title}</h2>
          <div className="mt-4">
            <RedeemPanel
              businessId={membership.businessId}
              initialCode={normalizeRedemptionCode(code ?? '')}
              labels={{
                text: r.text, code: r.code, check: r.check, checking: r.checking, scan: r.scan, stopScan: r.stopScan, scanHint: r.scanHint,
                cameraUnsupported: r.cameraUnsupported, cameraDenied: r.cameraDenied, found: r.found, customer: r.customer, deal: r.deal,
                branch: r.branch, claimedAt: r.claimedAt, validUntil: r.validUntil, toPay: r.toPay, confirm: r.confirm, completing: r.completing,
                completed: r.completed, next: r.next, networkError: t.common.networkError, codeInvalid: t.validation.code, sum: t.common.sum,
              }}
            />
          </div>
        </section>
        <div className="min-w-0 space-y-6">
          {bookings.length ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="font-black text-navy">{b.title} <span className="text-slate-400">· {bookings.length}</span></h2>
              <p className="mt-1 text-xs text-slate-500">{b.hint}</p>
              <ul className="mt-3 divide-y divide-slate-100">
                {bookings.map((row) => (
                  <li key={row.id} className="py-3 text-sm">
                    <p className="truncate font-bold text-navy">{row.dealTitle}</p>
                    <p className="truncate text-xs text-slate-500">
                      {row.customerName === DELETED_USER_NAME ? t.common.deletedUser : row.customerName} · {row.branchName} · {fmt(t.codes.validUntil, { time: formatClock(parseDbTime(row.expiresAt)) })}
                    </p>
                    <BookingActions businessId={membership.businessId} redemptionId={row.id} sent={row.sent} labels={{ ...b, networkError: t.common.networkError }} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-navy">{r.todayTitle} <span className="text-slate-400">· {today.length}</span></h2>
            {today.length ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {today.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-navy">{row.dealTitle}</p>
                      <p className="truncate text-xs text-slate-500">{row.customerName === DELETED_USER_NAME ? t.common.deletedUser : row.customerName} · {row.branchName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-primary">{formatSum(row.price, t)}</p>
                      <p className="text-xs text-slate-500">{formatClock(parseDbTime(row.completedAt))}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{r.todayEmpty}</p>
            )}
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
