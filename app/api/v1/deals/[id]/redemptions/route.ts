import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { randomToken, sha256Hex } from '@/lib/crypto';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import { evaluateClaimPolicy } from '@/modules/redemptions/policy';

const bodySchema = z.object({
  branchId: z.string().min(3).max(100),
  promoCode: z.string().trim().toUpperCase().max(24).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { code: 'CSRF_REJECTED', message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: { code: 'CONTENT_TYPE', message: 'JSON so‘rovi kutilgan.' } }, { status: 415 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  const idempotencyKey = request.headers.get('idempotency-key');
  if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 120) {
    return NextResponse.json({ error: { code: 'IDEMPOTENCY_KEY', message: 'Yaroqli Idempotency-Key talab qilinadi.' } }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION', message: 'Filial noto‘g‘ri ko‘rsatilgan.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const { id: dealId } = await context.params;
  const existing = await db.prepare('SELECT id, status, code_hint AS codeHint, expires_at AS expiresAt, user_id AS userId FROM redemptions WHERE idempotency_key = ?1').bind(idempotencyKey).first<{ id: string; status: string; codeHint: string; expiresAt: string; userId: string }>();
  if (existing) {
    if (existing.userId !== identity.id) return NextResponse.json({ error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Takroriy kalit boshqa so‘rovga tegishli.' } }, { status: 409 });
    return NextResponse.json({ data: { id: existing.id, status: existing.status, codeHint: existing.codeHint, expiresAt: existing.expiresAt, replayed: true } });
  }

  const deal = await db.prepare(`
    SELECT d.status, d.starts_at AS startsAt, d.ends_at AS endsAt,
      d.remaining_quantity AS remainingQuantity, d.per_customer_limit AS perCustomerLimit,
      d.discounted_price_uzs AS discountedPriceUzs,
      COUNT(r.id) AS existingClaims
    FROM deals d LEFT JOIN redemptions r ON r.deal_id = d.id AND r.user_id = ?2 AND r.status IN ('CLAIMED','COMPLETED')
    WHERE d.id = ?1 GROUP BY d.id
  `).bind(dealId, identity.id).first<{ status: string; startsAt: string; endsAt: string; remainingQuantity: number | null; perCustomerLimit: number; discountedPriceUzs: number; existingClaims: number }>();
  if (!deal) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Aksiya topilmadi.' } }, { status: 404 });

  const policy = evaluateClaimPolicy({ ...deal, startsAt: new Date(`${deal.startsAt}Z`), endsAt: new Date(`${deal.endsAt}Z`) });
  if (!policy.ok) return NextResponse.json({ error: policy }, { status: 409 });

  const branch = await db.prepare('SELECT deal_id FROM deal_branches WHERE deal_id = ?1 AND branch_id = ?2').bind(dealId, parsed.data.branchId).first();
  if (!branch) return NextResponse.json({ error: { code: 'BRANCH_UNAVAILABLE', message: 'Aksiya bu filialda mavjud emas.' } }, { status: 409 });

  // A promo code is optional and validated up front; it's applied best-effort right after the
  // claim succeeds (see below) so a promo-code edge case never blocks a legitimate claim.
  let promoCode: { id: string; discountType: 'PERCENT' | 'FIXED'; discountValue: number } | null = null;
  if (parsed.data.promoCode) {
    const row = await db
      .prepare(`SELECT id, discount_type AS discountType, discount_value AS discountValue, max_uses AS maxUses, used_count AS usedCount, expires_at AS expiresAt, is_active AS isActive
        FROM promo_codes WHERE code = ?1`)
      .bind(parsed.data.promoCode)
      .first<{ id: string; discountType: 'PERCENT' | 'FIXED'; discountValue: number; maxUses: number | null; usedCount: number; expiresAt: string | null; isActive: number }>();
    if (!row) return NextResponse.json({ error: { code: 'PROMO_NOT_FOUND', message: 'Promokod topilmadi.' } }, { status: 422 });
    if (!row.isActive) return NextResponse.json({ error: { code: 'PROMO_INACTIVE', message: 'Bu promokod faol emas.' } }, { status: 409 });
    if (row.expiresAt && new Date(`${row.expiresAt}Z`) <= new Date()) return NextResponse.json({ error: { code: 'PROMO_EXPIRED', message: 'Promokod muddati o‘tgan.' } }, { status: 409 });
    if (row.maxUses !== null && row.usedCount >= row.maxUses) return NextResponse.json({ error: { code: 'PROMO_EXHAUSTED', message: 'Promokod limiti tugagan.' } }, { status: 409 });
    const alreadyUsed = await db.prepare(`SELECT 1 FROM promo_code_redemptions WHERE promo_code_id = ?1 AND user_id = ?2`).bind(row.id, identity.id).first();
    if (alreadyUsed) return NextResponse.json({ error: { code: 'PROMO_ALREADY_USED', message: 'Siz bu promokoddan avval foydalangansiz.' } }, { status: 409 });
    promoCode = { id: row.id, discountType: row.discountType, discountValue: row.discountValue };
  }
  const finalPriceUzs = promoCode
    ? promoCode.discountType === 'PERCENT'
      ? Math.round((deal.discountedPriceUzs * (100 - promoCode.discountValue)) / 100)
      : Math.max(0, deal.discountedPriceUzs - promoCode.discountValue)
    : deal.discountedPriceUzs;

  const redemptionId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const code = randomToken(18);
  const codeHash = await sha256Hex(code);
  const codeHint = code.slice(-6).toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const results = await db.batch([
    db.prepare(`UPDATE deals SET
      remaining_quantity = CASE WHEN remaining_quantity IS NULL THEN NULL ELSE remaining_quantity - 1 END,
      status = CASE WHEN remaining_quantity = 1 THEN 'SOLD_OUT' ELSE status END,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1 AND status = 'ACTIVE'
        AND datetime(starts_at) <= datetime('now') AND datetime(ends_at) > datetime('now')
        AND (remaining_quantity IS NULL OR remaining_quantity > 0)
        AND (SELECT COUNT(*) FROM redemptions WHERE deal_id = ?1 AND user_id = ?2 AND status IN ('CLAIMED','COMPLETED')) < per_customer_limit`)
      .bind(dealId, identity.id),
    db.prepare(`INSERT INTO redemptions(id, deal_id, branch_id, user_id, idempotency_key, code_hash, code_hint, expires_at, final_price_uzs)
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9 WHERE changes() = 1`)
      .bind(redemptionId, dealId, parsed.data.branchId, identity.id, idempotencyKey, codeHash, codeHint, expiresAt, deal.discountedPriceUzs),
    db.prepare(`INSERT INTO redemption_events(id, redemption_id, actor_user_id, type, metadata_json)
      SELECT ?1, ?2, ?3, 'CLAIMED', ?4 WHERE EXISTS (SELECT 1 FROM redemptions WHERE id = ?2)`)
      .bind(eventId, redemptionId, identity.id, JSON.stringify({ branchId: parsed.data.branchId })),
    db.prepare(`INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id, after_json)
      SELECT ?1, ?2, 'redemption.claimed', 'Redemption', ?3, ?4 WHERE EXISTS (SELECT 1 FROM redemptions WHERE id = ?3)`)
      .bind(auditId, identity.id, redemptionId, JSON.stringify({ dealId, branchId: parsed.data.branchId })),
  ]);

  if ((results[1].meta.changes ?? 0) !== 1) {
    return NextResponse.json({ error: { code: 'CLAIM_CONFLICT', message: 'Aksiya limiti ayni paytda tugadi. Qayta urinmang.' } }, { status: 409 });
  }

  let promoApplied = false;
  if (promoCode) {
    const promoResults = await db.batch([
      db.prepare(`UPDATE promo_codes SET used_count = used_count + 1
        WHERE id = ?1 AND is_active = 1
          AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
          AND (max_uses IS NULL OR used_count < max_uses)`)
        .bind(promoCode.id),
      db.prepare(`INSERT INTO promo_code_redemptions(promo_code_id, user_id, redemption_id) SELECT ?1, ?2, ?3 WHERE changes() = 1`)
        .bind(promoCode.id, identity.id, redemptionId),
      db.prepare(`UPDATE redemptions SET promo_code_id = ?1, final_price_uzs = ?2 WHERE id = ?3 AND EXISTS (SELECT 1 FROM promo_code_redemptions WHERE redemption_id = ?3)`)
        .bind(promoCode.id, finalPriceUzs, redemptionId),
    ]);
    promoApplied = (promoResults[1].meta.changes ?? 0) === 1;
  }

  return NextResponse.json({ data: { id: redemptionId, status: 'CLAIMED', code, codeHint, expiresAt, finalPriceUzs: promoApplied ? finalPriceUzs : deal.discountedPriceUzs, promoApplied, replayed: false } }, { status: 201 });
}
