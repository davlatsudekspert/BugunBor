import { NextResponse } from 'next/server';

import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { getManagedDeal } from '@/modules/catalog/ownership';
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
  const { id } = await context.params;
  const managed = await getManagedDeal(db, identity.id, id, 'deal.write');
  if (!managed) return NextResponse.json({ error: { message: 'Aksiya topilmadi.' } }, { status: 404 });
  const { business, deal } = managed;
  if (deal.status !== 'ACTIVE' && deal.status !== 'SCHEDULED') {
    return NextResponse.json({ error: { message: 'Bu aksiya faol emas.' } }, { status: 409 });
  }

  const nowStored = new Date().toISOString().slice(0, 19).replace('T', ' ');
  // A SCHEDULED deal's starts_at is still ahead of "now" — setting only ends_at would leave
  // ends_at <= starts_at, which the deals table's own CHECK(ends_at > starts_at) constraint
  // rejects outright (a real 500 this hit in testing — note the check is a strict >, so even
  // clamping starts_at to the *same* instant as ends_at isn't enough). Pull starts_at to one
  // second before "now" in that case: the deal never actually opened, and is now simply over.
  const alsoClampStart = deal.status === 'SCHEDULED' && deal.startsAt > nowStored;
  const clampedStartsAt = new Date(Date.now() - 1000).toISOString().slice(0, 19).replace('T', ' ');
  const updateSql = alsoClampStart
    ? `UPDATE deals SET status = 'PAUSED', ends_at = ?1, starts_at = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND business_id = ?3`
    : `UPDATE deals SET status = 'PAUSED', ends_at = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND business_id = ?3`;
  await db.batch([
    alsoClampStart
      ? db.prepare(updateSql).bind(nowStored, id, business.id, clampedStartsAt)
      : db.prepare(updateSql).bind(nowStored, id, business.id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json)
        VALUES (?1, ?2, ?3, 'deal.stopped', 'Deal', ?4, ?5)`)
      .bind(crypto.randomUUID(), identity.id, business.id, id, JSON.stringify({ status: deal.status })),
  ]);

  return NextResponse.json({ data: { id, status: 'PAUSED' } });
}
