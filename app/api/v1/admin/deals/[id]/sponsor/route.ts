import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, mirrorAdminAsPlatformUser } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({ sponsored: z.boolean() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  if (!admin || !canAdmin(admin.role, 'admin.businesses.manage')) {
    return NextResponse.json({ error: { message: 'Ruxsat yetarli emas.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Noto‘g‘ri so‘rov.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const { id } = await context.params;
  const deal = await db
    .prepare(`SELECT d.id, d.business_id AS businessId, b.plan_id AS planId, b.subscription_status AS subscriptionStatus
      FROM deals d JOIN businesses b ON b.id = d.business_id WHERE d.id = ?1 AND d.deleted_at IS NULL`)
    .bind(id)
    .first<{ id: string; businessId: string; planId: string; subscriptionStatus: string }>();
  if (!deal) return NextResponse.json({ error: { message: 'Aksiya topilmadi.' } }, { status: 404 });

  // Sponsored placement is a paid Pro-plan benefit — enforced here, not just hidden in the UI,
  // so it can never be turned on for a business that isn't actually paying for it.
  if (parsed.data.sponsored && !(deal.planId === 'plan_pro' && deal.subscriptionStatus === 'ACTIVE')) {
    return NextResponse.json({ error: { message: 'Faqat faol Pro obunali bizneslarning aksiyalari sponsor qilinishi mumkin.' } }, { status: 409 });
  }

  await mirrorAdminAsPlatformUser(db, { id: admin.id, displayName: admin.displayName, role: admin.role });
  await db.batch([
    db.prepare('UPDATE deals SET is_sponsored = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2').bind(parsed.data.sponsored ? 1 : 0, id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
        VALUES (?1, ?2, ?3, 'deal.sponsor_toggled', 'Deal', ?4, ?5)`)
      .bind(crypto.randomUUID(), admin.id, deal.businessId, id, JSON.stringify({ sponsored: parsed.data.sponsored })),
  ]);

  return NextResponse.json({ data: { id, sponsored: parsed.data.sponsored } });
}
