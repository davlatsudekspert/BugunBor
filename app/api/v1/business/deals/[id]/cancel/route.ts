import { NextResponse } from 'next/server';

import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { getManagedDeal } from '@/modules/catalog/ownership';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const PRE_LAUNCH_STATUSES = new Set(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'SCHEDULED']);

/** Withdraws a deal before it has ever gone live. Once it's ACTIVE, use /stop instead — a launched deal is a promise already shown to customers, so it's ended, not erased. */
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
  const { id } = await context.params;
  const managed = await getManagedDeal(db, identity.id, id, 'deal.write');
  if (!managed) return NextResponse.json({ error: { message: 'Aksiya topilmadi.' } }, { status: 404 });
  const { business, deal } = managed;
  if (!PRE_LAUNCH_STATUSES.has(deal.status)) {
    return NextResponse.json({ error: { message: 'Faol yoki tugagan aksiyani bekor qilib bo‘lmaydi — "To‘xtatish"dan foydalaning.' } }, { status: 409 });
  }

  await db.batch([
    db.prepare(`UPDATE deals SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND business_id = ?2`).bind(id, business.id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json)
        VALUES (?1, ?2, ?3, 'deal.canceled', 'Deal', ?4, ?5)`)
      .bind(crypto.randomUUID(), identity.id, business.id, id, JSON.stringify({ status: deal.status })),
  ]);

  return NextResponse.json({ data: { id, canceled: true } });
}
