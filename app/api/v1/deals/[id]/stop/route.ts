import { NextResponse } from 'next/server';

import { ensureDatabase, getDb } from '@/db/runtime';
import {
  canAccessBusiness,
  type BusinessRole,
} from '@/modules/auth/authorization';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import { canStopDeal, type DealLifecycleStatus } from '@/modules/deals/policy';

/** Section 11: a business may always end a LIVE deal early — never extend or raise it. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: { message: 'So‘rov manbasi tasdiqlanmadi.' } },
      { status: 403 },
    );
  }
  const identity = await getRequestIdentity(request);
  if (!identity)
    return NextResponse.json(
      { error: { message: 'Davom etish uchun tizimga kiring.' } },
      { status: 401 },
    );

  await ensureDatabase();
  const db = getDb();
  const { id: dealId } = await context.params;
  const deal = await db
    .prepare(
      'SELECT business_id AS "businessId", status FROM deals WHERE id = ?1 AND deleted_at IS NULL',
    )
    .bind(dealId)
    .first<{ businessId: string; status: DealLifecycleStatus }>();
  if (!deal)
    return NextResponse.json(
      { error: { message: 'E’lon topilmadi.' } },
      { status: 404 },
    );

  const membership = await db
    .prepare(
      'SELECT role FROM business_members WHERE business_id = ?1 AND user_id = ?2 AND revoked_at IS NULL',
    )
    .bind(deal.businessId, identity.id)
    .first<{ role: BusinessRole }>();
  if (
    !membership ||
    !canAccessBusiness({
      requestedBusinessId: deal.businessId,
      membershipBusinessId: deal.businessId,
      role: membership.role,
      action: 'deal.write',
    })
  ) {
    return NextResponse.json(
      { error: { message: 'Ushbu e’lonni to‘xtatish ruxsati yo‘q.' } },
      { status: 403 },
    );
  }

  const policy = canStopDeal(deal.status);
  if (!policy.ok) return NextResponse.json({ error: policy }, { status: 409 });

  await db.batch([
    db
      .prepare(
        `UPDATE deals SET status = 'STOPPED', ends_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND status = 'ACTIVE'`,
      )
      .bind(dealId),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json)
      VALUES (?1, ?2, ?3, 'deal.stopped', 'Deal', ?4, ?5)`)
      .bind(
        crypto.randomUUID(),
        identity.id,
        deal.businessId,
        dealId,
        JSON.stringify(deal),
      ),
  ]);
  return NextResponse.json({ data: { id: dealId, status: 'STOPPED' } });
}
