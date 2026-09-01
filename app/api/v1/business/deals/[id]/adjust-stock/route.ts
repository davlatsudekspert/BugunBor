import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { getOwnedBusiness } from '@/modules/catalog/ownership';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({ quantitySold: z.coerce.number().int().min(1).max(1000).default(1) });

/**
 * Records a sale made in person (walk-in, phone order) that never went
 * through the online claim flow, so the online remaining_quantity stays
 * truthful. Without this, staff who sell offline without touching BugunBor
 * would leave stale stock numbers online — the exact overselling risk that
 * makes "call ahead to confirm" necessary in the first place.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  await ensurePhase1Database();
  await syncDealLifecycle();
  const db = getD1();
  const business = await getOwnedBusiness(db, identity.id, 'redemption.validate');
  if (!business) return NextResponse.json({ error: { message: 'Ruxsat yo‘q.' } }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Sotilgan miqdorni to‘g‘ri kiriting.' } }, { status: 422 });

  const { id } = await context.params;
  const deal = await db
    .prepare(`SELECT id, title, status, remaining_quantity AS remainingQuantity FROM deals WHERE id = ?1 AND business_id = ?2 AND deleted_at IS NULL`)
    .bind(id, business.id)
    .first<{ id: string; title: string; status: string; remainingQuantity: number | null }>();
  if (!deal) return NextResponse.json({ error: { message: 'Aksiya topilmadi.' } }, { status: 404 });
  if (deal.status !== 'ACTIVE') return NextResponse.json({ error: { message: 'Faqat faol aksiya uchun miqdor belgilash mumkin.' } }, { status: 409 });
  if (deal.remainingQuantity === null) return NextResponse.json({ error: { message: 'Miqdori cheklanmagan aksiyada bu kerak emas.' } }, { status: 422 });
  if (parsed.data.quantitySold > deal.remainingQuantity) {
    return NextResponse.json({ error: { message: `Faqat ${deal.remainingQuantity} ta qoldi — undan ko‘pini belgilab bo‘lmaydi.` } }, { status: 409 });
  }

  const nextRemaining = deal.remainingQuantity - parsed.data.quantitySold;
  await db.batch([
    db
      .prepare(`UPDATE deals SET remaining_quantity = ?1, status = CASE WHEN ?1 = 0 THEN 'SOLD_OUT' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = ?2`)
      .bind(nextRemaining, id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
        VALUES (?1, ?2, ?3, 'deal.stock_adjusted_offline', 'Deal', ?4, ?5)`)
      .bind(crypto.randomUUID(), identity.id, business.id, id, JSON.stringify({ quantitySold: parsed.data.quantitySold, remainingQuantity: nextRemaining })),
  ]);

  return NextResponse.json({ data: { id, remainingQuantity: nextRemaining, status: nextRemaining === 0 ? 'SOLD_OUT' : deal.status } });
}
