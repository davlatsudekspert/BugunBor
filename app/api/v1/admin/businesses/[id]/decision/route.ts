import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, mirrorAdminAsPlatformUser } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const decisionSchema = z.object({ decision: z.enum(['VERIFY', 'REJECT', 'SUSPEND', 'REINSTATE']), reason: z.string().trim().min(10).max(800) });

const nextStatus: Record<z.infer<typeof decisionSchema>['decision'], string> = {
  VERIFY: 'VERIFIED',
  REJECT: 'REJECTED',
  SUSPEND: 'REJECTED',
  REINSTATE: 'VERIFIED',
};

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

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Qaror va kamida 10 belgili sabab kerak.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const { id } = await context.params;
  const business = await db.prepare('SELECT id, verification_status AS verificationStatus FROM businesses WHERE id = ?1 AND deleted_at IS NULL').bind(id).first<{ id: string; verificationStatus: string }>();
  if (!business) return NextResponse.json({ error: { message: 'Biznes topilmadi.' } }, { status: 404 });

  const before = JSON.stringify({ verificationStatus: business.verificationStatus });
  const status = nextStatus[parsed.data.decision];
  const after = JSON.stringify({ verificationStatus: status });

  await mirrorAdminAsPlatformUser(db, { id: admin.id, displayName: admin.displayName, role: admin.role });
  await db.batch([
    db.prepare('UPDATE businesses SET verification_status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2').bind(status, id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, reason, before_json, after_json)
        VALUES (?1, ?2, ?3, 'business.admin_decision', 'Business', ?3, ?4, ?5, ?6)`)
      .bind(crypto.randomUUID(), admin.id, id, parsed.data.reason, before, after),
  ]);

  return NextResponse.json({ data: { id, verificationStatus: status } });
}
