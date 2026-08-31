import type { Metadata } from 'next';
import {
  Activity,
  BadgeCheck,
  CalendarClock,
  Eye,
  QrCode,
  TicketCheck,
} from 'lucide-react';

import { DealRowActions } from '@/components/deal-row-actions';
import { ensureDatabase, getDb } from '@/db/runtime';

export const metadata: Metadata = {
  title: 'Biznes dashboard',
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama',
  PENDING_REVIEW: 'Tekshiruvda',
  SCHEDULED: 'Rejalashtirilgan',
  ACTIVE: 'Faol',
  SOLD_OUT: 'Sotildi',
  EXPIRED: 'Muddati tugagan',
  STOPPED: 'To‘xtatilgan',
  REJECTED: 'Rad etilgan',
  ARCHIVED: 'O‘chirilgan',
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SCHEDULED: 'bg-sky-50 text-sky-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  DRAFT: 'bg-slate-100 text-slate-600',
};

type DealRow = {
  id: string;
  title: string;
  dealType: 'PRODUCT' | 'SERVICE';
  status: string;
  discountedPriceUzs: number;
  startsAt: string;
  endsAt: string;
};

export default async function BusinessDashboardPage() {
  await ensureDatabase();
  const db = getDb();
  const business = await db
    .prepare(
      `SELECT id, name, verification_status AS "verificationStatus" FROM businesses WHERE deleted_at IS NULL ORDER BY CASE verification_status WHEN 'PENDING' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
    )
    .first<{ id: string; name: string; verificationStatus: string }>();
  const metrics = business
    ? await db
        .prepare(
          `SELECT COUNT(DISTINCT d.id)::int AS deals, SUM(CASE WHEN d.status='ACTIVE' THEN 1 ELSE 0 END)::int AS "activeDeals", COUNT(r.id)::int AS redemptions FROM deals d LEFT JOIN redemptions r ON r.deal_id=d.id WHERE d.business_id=?1`,
        )
        .bind(business.id)
        .first<{ deals: number; activeDeals: number; redemptions: number }>()
    : null;
  const statusCounts = business
    ? await db
        .prepare(
          `SELECT status, COUNT(*)::int AS count FROM deals WHERE business_id = ?1 AND deleted_at IS NULL GROUP BY status`,
        )
        .bind(business.id)
        .all<{ status: string; count: number }>()
    : null;
  const deals = business
    ? (
        await db
          .prepare(`SELECT id, title, deal_type AS "dealType", status, discounted_price_uzs AS "discountedPriceUzs", starts_at AS "startsAt", ends_at AS "endsAt"
          FROM deals WHERE business_id = ?1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 30`)
          .bind(business.id)
          .all<DealRow>()
      ).results
    : [];

  const counts = Object.fromEntries(
    (statusCounts?.results ?? []).map((row) => [row.status, row.count]),
  );
  const cards = [
    {
      label: 'Faol aksiyalar',
      value: metrics?.activeDeals ?? 0,
      icon: Activity,
    },
    { label: 'Jami aksiyalar', value: metrics?.deals ?? 0, icon: Eye },
    {
      label: 'Band qilishlar',
      value: metrics?.redemptions ?? 0,
      icon: TicketCheck,
    },
    { label: 'NFC tashriflar', value: 0, icon: QrCode },
  ];
  const lifecycleCards = [
    { label: 'Faol', value: counts.ACTIVE ?? 0 },
    {
      label: 'Rejalashtirilgan',
      value: (counts.SCHEDULED ?? 0) + (counts.PENDING_REVIEW ?? 0),
    },
    {
      label: 'Tugagan',
      value:
        (counts.EXPIRED ?? 0) + (counts.SOLD_OUT ?? 0) + (counts.STOPPED ?? 0),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-[#152a3b]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="text-xl font-black">
            Bugun<span className="text-primary">Bor</span>
          </a>
          <a
            href="/business/onboarding"
            className="text-sm font-bold text-primary"
          >
            + Yangi biznes
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.12em] text-primary">
              Business workspace
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">
              {business?.name ?? 'Biznes dashboard'}
            </h1>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
            <BadgeCheck className="size-4 text-emerald-600" />{' '}
            {business?.verificationStatus ?? 'Ma’lumot yo‘q'}
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <Icon className="size-5 text-primary" />
              <strong className="mt-7 block text-3xl font-black">
                {value}
              </strong>
              <span className="text-sm text-slate-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap gap-6">
            {lifecycleCards.map(({ label, value }) => (
              <div key={label}>
                <strong className="block text-2xl font-black">{value}</strong>
                <span className="text-sm text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          {business ? (
            <div className="flex gap-2">
              <a
                href="/business/deals/new"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
              >
                + Mahsulot / Xizmat
              </a>
            </div>
          ) : null}
        </div>

        {business && deals.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">E’lon</th>
                    <th className="px-5 py-3">Turi</th>
                    <th className="px-5 py-3">Holati</th>
                    <th className="px-5 py-3">Narx</th>
                    <th className="px-5 py-3">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals.map((deal) => (
                    <tr key={deal.id}>
                      <td className="px-5 py-3 font-semibold">{deal.title}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {deal.dealType === 'PRODUCT'
                          ? '📦 Mahsulot'
                          : '✂️ Xizmat'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[deal.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {STATUS_LABELS[deal.status] ?? deal.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {new Intl.NumberFormat('uz-UZ').format(
                          deal.discountedPriceUzs,
                        )}{' '}
                        so‘m
                      </td>
                      <td className="px-5 py-3">
                        <DealRowActions id={deal.id} status={deal.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <CalendarClock className="size-5 text-primary" /> Keyingi qadam
          </h2>
          <p className="mt-2 text-slate-600">
            Tasdiqlash holatini kuzating, so‘ng filial va birinchi aksiyani
            kiriting. Tenant tekshiruvi har bir yozuvda server tomonida
            ishlaydi.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="/business/onboarding"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
            >
              Profilni to‘ldirish
            </a>
            <a
              href="/business/deals/new"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
            >
              Yangi e’lon
            </a>
            <a
              href="/admin/deals"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
            >
              Moderatsiya demo
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
