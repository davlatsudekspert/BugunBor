import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { sha256Hex } from '@/lib/crypto';
import { getOwnedBusiness } from '@/modules/catalog/ownership';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({ code: z.string().trim().min(4).max(64) });

/**
 * Closes the loop the claim flow (POST /api/v1/deals/:id/redemptions) opens:
 * a customer gets a one-time code, and this is where staff at the branch
 * spend it. Only the plain code the customer shows on their phone can
 * validate a redemption — the server only ever stored its SHA-256 hash, so
 * there is nothing here for a leaked database to forge a redemption from.
 */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  await ensurePhase1Database();
  const db = getD1();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Kodni kiriting.' } }, { status: 422 });

  // The code is a case-sensitive token (see modules randomToken in lib/crypto.ts) — it must be
  // hashed exactly as the customer received it, never case-normalized, or it will never match.
  // Look up which business the code's deal actually belongs to first, then check membership
  // against *that* business — not "whichever business getOwnedBusiness() happens to default
  // to" (its most recently joined membership), which would reject a perfectly valid code the
  // moment staff belonged to more than one business.
  const codeHash = await sha256Hex(parsed.data.code.trim());
  const redemption = await db
    .prepare(`SELECT r.id, r.status, r.expires_at AS expiresAt, d.title AS dealTitle, br.name AS branchName, br.business_id AS businessId
      FROM redemptions r
      JOIN deals d ON d.id = r.deal_id
      JOIN branches br ON br.id = r.branch_id
      WHERE r.code_hash = ?1`)
    .bind(codeHash)
    .first<{ id: string; status: string; expiresAt: string; dealTitle: string; branchName: string; businessId: string }>();

  if (!redemption) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Kod noto‘g‘ri yoki bu biznesga tegishli emas.' } }, { status: 404 });

  const business = await getOwnedBusiness(db, identity.id, 'redemption.validate', redemption.businessId);
  if (!business) return NextResponse.json({ error: { message: 'Kodlarni tasdiqlash uchun ruxsat yo‘q.' } }, { status: 403 });
  if (redemption.status === 'COMPLETED') return NextResponse.json({ error: { code: 'ALREADY_USED', message: 'Bu kod allaqachon ishlatilgan.' } }, { status: 409 });
  if (redemption.status !== 'CLAIMED') return NextResponse.json({ error: { code: 'INVALID_STATE', message: 'Bu kod endi amal qilmaydi.' } }, { status: 409 });
  if (new Date(`${redemption.expiresAt}Z`) <= new Date()) return NextResponse.json({ error: { code: 'EXPIRED', message: 'Kod muddati o‘tgan.' } }, { status: 409 });

  const results = await db.batch([
    // Guarded by status = 'CLAIMED' so two staff scanning the same code at once can't both "win".
    db.prepare(`UPDATE redemptions SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?1 AND status = 'CLAIMED'`).bind(redemption.id),
    db
      .prepare(`INSERT INTO redemption_events(id, redemption_id, actor_user_id, type) SELECT ?1, ?2, ?3, 'COMPLETED' WHERE changes() = 1`)
      .bind(crypto.randomUUID(), redemption.id, identity.id),
  ]);

  if ((results[0].meta.changes ?? 0) !== 1) {
    return NextResponse.json({ error: { code: 'ALREADY_USED', message: 'Bu kod ayni paytda boshqa so‘rov bilan ishlatildi.' } }, { status: 409 });
  }

  return NextResponse.json({ data: { dealTitle: redemption.dealTitle, branchName: redemption.branchName, status: 'COMPLETED' } });
}
