import { NextResponse } from 'next/server';

import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { getOwnedBusiness, getOwnedDeal } from '@/modules/catalog/ownership';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

/** Ends a live deal immediately — the one time-related change post-launch always allowed. */
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
  const business = await getOwnedBusiness(db, identity.id);
  if (!business) return NextResponse.json({ error: { message: 'Ruxsat yo‘q.' } }, { status: 403 });

  const { id } = await context.params;
  const deal = await getOwnedDeal(db, business.id, id);
  if (!deal) return NextResponse.json({ error: { message: 'Aksiya topilmadi.' } }, { status: 404 });
  if (deal.status !== 'ACTIVE' && deal.status !== 'SCHEDULED') {
    return NextResponse.json({ error: { message: 'Bu aksiya faol emas.' } }, { status: 409 });
  }

  const nowStored = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.batch([
    db.prepare(`UPDATE deals SET status = 'PAUSED', ends_at = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND business_id = ?3`).bind(nowStored, id, business.id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json)
        VALUES (?1, ?2, ?3, 'deal.stopped', 'Deal', ?4, ?5)`)
      .bind(crypto.randomUUID(), identity.id, business.id, id, JSON.stringify({ status: deal.status })),
  ]);

  return NextResponse.json({ data: { id, status: 'PAUSED' } });
}
