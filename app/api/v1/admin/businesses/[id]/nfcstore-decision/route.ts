import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, mirrorAdminAsPlatformUser } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const decisionSchema = z.object({ decision: z.enum(['VERIFY', 'REJECT', 'SUSPEND', 'REINSTATE']), reason: z.string().trim().min(10).max(800) });

const nextStatus: Record<z.infer<typeof decisionSchema>['decision'], string> = {
  VERIFY: 'VERIFIED',
  REJECT: 'VERIFICATION_FAILED',
  SUSPEND: 'SUSPENDED',
  REINSTATE: 'VERIFIED',
};

/**
 * The manual verification fallback modules/integrations/nfcstore-verification.ts's own
 * comment describes — there is no live NFCStore API to check ownership automatically today,
 * so a human admin confirming the profile really belongs to this business (by opening the
 * link and comparing) is what actually flips `nfcstore_discount_eligible`, never a client
 * request. Reusing `admin.businesses.manage` rather than a new action: this is the same
 * "does this business's claim check out" judgment call as verifying the business itself.
 */
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
  const business = await db
    .prepare('SELECT id, nfcstore_business_url AS nfcstoreBusinessUrl, nfcstore_status AS nfcstoreStatus FROM businesses WHERE id = ?1 AND deleted_at IS NULL')
    .bind(id)
    .first<{ id: string; nfcstoreBusinessUrl: string | null; nfcstoreStatus: string }>();
  if (!business) return NextResponse.json({ error: { message: 'Biznes topilmadi.' } }, { status: 404 });
  if (!business.nfcstoreBusinessUrl) return NextResponse.json({ error: { message: 'Bu biznes NFCStore profilini ulamagan.' } }, { status: 409 });

  const status = nextStatus[parsed.data.decision];
  const discountEligible = status === 'VERIFIED' ? 1 : 0;
  const before = JSON.stringify({ nfcstoreStatus: business.nfcstoreStatus });
  const after = JSON.stringify({ nfcstoreStatus: status });

  await mirrorAdminAsPlatformUser(db, { id: admin.id, displayName: admin.displayName, role: admin.role });
  await db.batch([
    db
      .prepare(`UPDATE businesses SET nfcstore_status = ?1, nfcstore_discount_eligible = ?2, nfcstore_verified_at = CASE WHEN ?1 = 'VERIFIED' THEN CURRENT_TIMESTAMP ELSE nfcstore_verified_at END, nfcstore_last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?3`)
      .bind(status, discountEligible, id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, reason, before_json, after_json)
        VALUES (?1, ?2, ?3, 'business.nfcstore_admin_decision', 'Business', ?3, ?4, ?5, ?6)`)
      .bind(crypto.randomUUID(), admin.id, id, parsed.data.reason, before, after),
  ]);

  return NextResponse.json({ data: { id, nfcstoreStatus: status, nfcstoreDiscountEligible: Boolean(discountEligible) } });
}
