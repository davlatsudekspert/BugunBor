import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import { evaluateClaimPolicy } from '@/modules/redemptions/policy';

const bodySchema = z.object({ branchId: z.string().min(3).max(100) });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 18) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

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
      COUNT(r.id) AS existingClaims
    FROM deals d LEFT JOIN redemptions r ON r.deal_id = d.id AND r.user_id = ?2 AND r.status IN ('CLAIMED','COMPLETED')
    WHERE d.id = ?1 GROUP BY d.id
  `).bind(dealId, identity.id).first<{ status: string; startsAt: string; endsAt: string; remainingQuantity: number | null; perCustomerLimit: number; existingClaims: number }>();
  if (!deal) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Aksiya topilmadi.' } }, { status: 404 });

  const policy = evaluateClaimPolicy({ ...deal, startsAt: new Date(`${deal.startsAt}Z`), endsAt: new Date(`${deal.endsAt}Z`) });
  if (!policy.ok) return NextResponse.json({ error: policy }, { status: 409 });

  const branch = await db.prepare('SELECT deal_id FROM deal_branches WHERE deal_id = ?1 AND branch_id = ?2').bind(dealId, parsed.data.branchId).first();
  if (!branch) return NextResponse.json({ error: { code: 'BRANCH_UNAVAILABLE', message: 'Aksiya bu filialda mavjud emas.' } }, { status: 409 });

  const redemptionId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const code = randomToken();
  const codeHash = await sha256(code);
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
    db.prepare(`INSERT INTO redemptions(id, deal_id, branch_id, user_id, idempotency_key, code_hash, code_hint, expires_at)
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8 WHERE changes() = 1`)
      .bind(redemptionId, dealId, parsed.data.branchId, identity.id, idempotencyKey, codeHash, codeHint, expiresAt),
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

  return NextResponse.json({ data: { id: redemptionId, status: 'CLAIMED', code, codeHint, expiresAt, replayed: false } }, { status: 201 });
}
