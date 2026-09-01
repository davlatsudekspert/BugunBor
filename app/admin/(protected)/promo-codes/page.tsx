import type { Metadata } from 'next';
import { TicketPercent } from 'lucide-react';

import { PromoCodeForm } from '@/components/admin/promo-code-form';
import { PromoCodeRow } from '@/components/admin/promo-code-row';
import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireAdminPage } from '@/modules/admin/guard';

export const metadata: Metadata = { title: 'Promokodlar', robots: { index: false, follow: false } };

type PromoCodeRecord = {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: number;
};

export default async function AdminPromoCodesPage() {
  await requireAdminPage('admin.promocodes.manage');
  await ensurePhase1Database();
  const promoCodes = await getD1()
    .prepare(`SELECT id, code, discount_type AS discountType, discount_value AS discountValue, max_uses AS maxUses, used_count AS usedCount, expires_at AS expiresAt, is_active AS isActive FROM promo_codes ORDER BY created_at DESC`)
    .all<PromoCodeRecord>();

  return (
    <main className="px-4 py-8 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Monetizatsiya</p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-black tracking-[-.04em]"><TicketPercent className="size-7 text-primary" /> Promokodlar</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Mijozlar aksiyani band qilishda shu kodlardan foydalanib qo‘shimcha chegirma olishlari mumkin.</p>

      <div className="mt-8"><PromoCodeForm /></div>

      <div className="mt-6 space-y-3">
        {promoCodes.results.length ? (
          promoCodes.results.map((promoCode) => (
            <PromoCodeRow
              key={promoCode.id}
              promoCode={{
                id: promoCode.id,
                code: promoCode.code,
                discountType: promoCode.discountType,
                discountValue: promoCode.discountValue,
                maxUses: promoCode.maxUses,
                usedCount: promoCode.usedCount,
                expiresAt: promoCode.expiresAt,
                isActive: Boolean(promoCode.isActive),
              }}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-500">Hozircha promokod yo‘q.</p>
        )}
      </div>
    </main>
  );
}
