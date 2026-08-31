import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, mirrorAdminAsPlatformUser } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({ planId: z.string().min(1).max(60), subscriptionStatus: z.enum(['FREE', 'ACTIVE', 'PAST_DUE', 'CANCELED']) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  // Plan/subscription changes are billing state, so both business managers and the accountant may set them.
  if (!admin || !(canAdmin(admin.role, 'admin.businesses.manage') || canAdmin(admin.role, 'admin.plans.manage'))) {
    return NextResponse.json({ error: { message: 'Ruxsat yetarli emas.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Reja va obuna holatini tanlang.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const { id } = await context.params;
  const [business, plan] = await Promise.all([
    db.prepare('SELECT id, plan_id AS planId, subscription_status AS subscriptionStatus FROM businesses WHERE id = ?1 AND deleted_at IS NULL').bind(id).first<{ id: string; planId: string; subscriptionStatus: string }>(),
    db.prepare('SELECT id FROM plans WHERE id = ?1').bind(parsed.data.planId).first<{ id: string }>(),
  ]);
  if (!business) return NextResponse.json({ error: { message: 'Biznes topilmadi.' } }, { status: 404 });
  if (!plan) return NextResponse.json({ error: { message: 'Reja topilmadi.' } }, { status: 404 });

  const before = JSON.stringify({ planId: business.planId, subscriptionStatus: business.subscriptionStatus });
  const after = JSON.stringify({ planId: parsed.data.planId, subscriptionStatus: parsed.data.subscriptionStatus });

  await mirrorAdminAsPlatformUser(db, { id: admin.id, displayName: admin.displayName, role: admin.role });
  await db.batch([
    db.prepare('UPDATE businesses SET plan_id = ?1, subscription_status = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3').bind(parsed.data.planId, parsed.data.subscriptionStatus, id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json, after_json)
        VALUES (?1, ?2, ?3, 'business.plan_changed', 'Business', ?3, ?4, ?5)`)
      .bind(crypto.randomUUID(), admin.id, id, before, after),
  ]);

  return NextResponse.json({ data: { id, planId: parsed.data.planId, subscriptionStatus: parsed.data.subscriptionStatus } });
}
