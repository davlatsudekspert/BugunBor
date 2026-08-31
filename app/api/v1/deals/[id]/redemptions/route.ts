import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureDatabase, getDb } from '@/db/runtime';
import { toStoredUtc } from '@/lib/time';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import {
  evaluateClaimPolicy,
  evaluateSlotClaimPolicy,
} from '@/modules/redemptions/policy';

const bodySchema = z.object({
  branchId: z.string().min(3).max(100),
  slotId: z.string().min(3).max(100).optional(),
});

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function randomToken(bytes = 18) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'CSRF_REJECTED',
          message: 'So‘rov manbasi tasdiqlanmadi.',
        },
      },
      { status: 403 },
    );
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json(
      { error: { code: 'CONTENT_TYPE', message: 'JSON so‘rovi kutilgan.' } },
      { status: 415 },
    );
  }

  const identity = await getRequestIdentity(request);
  if (!identity)
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Davom etish uchun tizimga kiring.',
        },
      },
      { status: 401 },
    );

  const idempotencyKey = request.headers.get('idempotency-key');
  if (
    !idempotencyKey ||
    idempotencyKey.length < 12 ||
    idempotencyKey.length > 120
  ) {
    return NextResponse.json(
      {
        error: {
          code: 'IDEMPOTENCY_KEY',
          message: 'Yaroqli Idempotency-Key talab qilinadi.',
        },
      },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION',
          message: 'Filial noto‘g‘ri ko‘rsatilgan.',
        },
      },
      { status: 422 },
    );

  await ensureDatabase();
  const db = getDb();
  const { id: dealId } = await context.params;
  const existing = await db
    .prepare(
      'SELECT id, status, code_hint AS "codeHint", expires_at AS "expiresAt", user_id AS "userId" FROM redemptions WHERE idempotency_key = ?1',
    )
    .bind(idempotencyKey)
    .first<{
      id: string;
      status: string;
      codeHint: string;
      expiresAt: string;
      userId: string;
    }>();
  if (existing) {
    if (existing.userId !== identity.id)
      return NextResponse.json(
        {
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Takroriy kalit boshqa so‘rovga tegishli.',
          },
        },
        { status: 409 },
      );
    return NextResponse.json({
      data: {
        id: existing.id,
        status: existing.status,
        codeHint: existing.codeHint,
        expiresAt: existing.expiresAt,
        replayed: true,
      },
    });
  }

  const deal = await db
    .prepare(`
    SELECT d.deal_type AS "dealType", d.status, d.starts_at AS "startsAt", d.ends_at AS "endsAt",
      d.remaining_quantity AS "remainingQuantity", d.per_customer_limit AS "perCustomerLimit",
      COUNT(r.id)::int AS "existingClaims"
    FROM deals d LEFT JOIN redemptions r ON r.deal_id = d.id AND r.user_id = ?2 AND r.status IN ('CLAIMED','COMPLETED')
    WHERE d.id = ?1 GROUP BY d.id
  `)
    .bind(dealId, identity.id)
    .first<{
      dealType: 'PRODUCT' | 'SERVICE';
      status: string;
      startsAt: string;
      endsAt: string;
      remainingQuantity: number | null;
      perCustomerLimit: number;
      existingClaims: number;
    }>();
  if (!deal)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Aksiya topilmadi.' } },
      { status: 404 },
    );

  const branch = await db
    .prepare(
      'SELECT deal_id FROM deal_branches WHERE deal_id = ?1 AND branch_id = ?2',
    )
    .bind(dealId, parsed.data.branchId)
    .first();
  if (!branch)
    return NextResponse.json(
      {
        error: {
          code: 'BRANCH_UNAVAILABLE',
          message: 'Aksiya bu filialda mavjud emas.',
        },
      },
      { status: 409 },
    );

  const redemptionId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const code = randomToken();
  const codeHash = await sha256(code);
  const codeHint = code.slice(-6).toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (deal.dealType === 'SERVICE') {
    if (!parsed.data.slotId)
      return NextResponse.json(
        {
          error: {
            code: 'SLOT_REQUIRED',
            message: 'Xizmat uchun vaqt tanlash shart.',
          },
        },
        { status: 422 },
      );
    const slot = await db
      .prepare(
        'SELECT starts_at AS "startsAt", remaining_capacity AS "remainingCapacity" FROM service_slots WHERE id = ?1 AND deal_id = ?2',
      )
      .bind(parsed.data.slotId, dealId)
      .first<{ startsAt: string; remainingCapacity: number }>();
    if (!slot)
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tanlangan vaqt topilmadi.' } },
        { status: 404 },
      );

    const policy = evaluateSlotClaimPolicy({
      dealStatus: deal.status,
      dealStartsAt: new Date(`${deal.startsAt}Z`),
      dealEndsAt: new Date(`${deal.endsAt}Z`),
      slotStartsAt: new Date(`${slot.startsAt}Z`),
      slotRemainingCapacity: slot.remainingCapacity,
      existingClaims: deal.existingClaims,
      perCustomerLimit: deal.perCustomerLimit,
    });
    if (!policy.ok)
      return NextResponse.json({ error: policy }, { status: 409 });

    // One atomic statement: reserve the slot, then cascade the redemption/event/audit
    // inserts through CTEs that only fire if the row before them actually landed.
    // (Postgres has no `changes()`/`WHERE EXISTS (SELECT 1 FROM redemptions ...)`
    // trick like D1/SQLite does — a chained CTE is the atomic equivalent.)
    const result = await db
      .prepare(`
      WITH updated AS (
        UPDATE service_slots SET remaining_capacity = remaining_capacity - 1
        WHERE id = ?1 AND deal_id = ?2 AND remaining_capacity > 0
          AND (SELECT COUNT(*) FROM redemptions WHERE deal_id = ?2 AND user_id = ?3 AND status IN ('CLAIMED','COMPLETED')) < (SELECT per_customer_limit FROM deals WHERE id = ?2)
        RETURNING id
      ), inserted_redemption AS (
        INSERT INTO redemptions(id, deal_id, branch_id, user_id, slot_id, idempotency_key, code_hash, code_hint, expires_at)
        SELECT ?4, ?2, ?5, ?3, ?1, ?6, ?7, ?8, ?9 FROM updated
        RETURNING id
      ), inserted_event AS (
        INSERT INTO redemption_events(id, redemption_id, actor_user_id, type, metadata_json)
        SELECT ?10, id, ?3, 'CLAIMED', ?11 FROM inserted_redemption
        RETURNING id
      )
      INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id, after_json)
      SELECT ?12, ?3, 'redemption.claimed', 'Redemption', ?4, ?13 FROM inserted_event
    `)
      .bind(
        parsed.data.slotId,
        dealId,
        identity.id,
        redemptionId,
        parsed.data.branchId,
        idempotencyKey,
        codeHash,
        codeHint,
        expiresAt,
        eventId,
        JSON.stringify({
          branchId: parsed.data.branchId,
          slotId: parsed.data.slotId,
        }),
        auditId,
        JSON.stringify({
          dealId,
          branchId: parsed.data.branchId,
          slotId: parsed.data.slotId,
        }),
      )
      .run();

    if ((result.meta.changes ?? 0) !== 1) {
      return NextResponse.json(
        {
          error: {
            code: 'CLAIM_CONFLICT',
            message: 'Bu vaqt ayni paytda band bo‘ldi. Boshqasini tanlang.',
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        data: {
          id: redemptionId,
          status: 'CLAIMED',
          code,
          codeHint,
          expiresAt,
          replayed: false,
        },
      },
      { status: 201 },
    );
  }

  const policy = evaluateClaimPolicy({
    ...deal,
    startsAt: new Date(`${deal.startsAt}Z`),
    endsAt: new Date(`${deal.endsAt}Z`),
  });
  if (!policy.ok) return NextResponse.json({ error: policy }, { status: 409 });

  const result = await db
    .prepare(`
    WITH updated AS (
      UPDATE deals SET
        remaining_quantity = CASE WHEN remaining_quantity IS NULL THEN NULL ELSE remaining_quantity - 1 END,
        status = CASE WHEN remaining_quantity = 1 THEN 'SOLD_OUT' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1 AND status = 'ACTIVE'
        AND starts_at <= ?3 AND ends_at > ?3
        AND (remaining_quantity IS NULL OR remaining_quantity > 0)
        AND (SELECT COUNT(*) FROM redemptions WHERE deal_id = ?1 AND user_id = ?2 AND status IN ('CLAIMED','COMPLETED')) < per_customer_limit
      RETURNING id
    ), inserted_redemption AS (
      INSERT INTO redemptions(id, deal_id, branch_id, user_id, idempotency_key, code_hash, code_hint, expires_at)
      SELECT ?4, ?1, ?5, ?2, ?6, ?7, ?8, ?9 FROM updated
      RETURNING id
    ), inserted_event AS (
      INSERT INTO redemption_events(id, redemption_id, actor_user_id, type, metadata_json)
      SELECT ?10, id, ?2, 'CLAIMED', ?11 FROM inserted_redemption
      RETURNING id
    )
    INSERT INTO audit_logs(id, actor_user_id, action, target_type, target_id, after_json)
    SELECT ?12, ?2, 'redemption.claimed', 'Redemption', ?4, ?13 FROM inserted_event
  `)
    .bind(
      dealId,
      identity.id,
      toStoredUtc(new Date().toISOString()),
      redemptionId,
      parsed.data.branchId,
      idempotencyKey,
      codeHash,
      codeHint,
      expiresAt,
      eventId,
      JSON.stringify({ branchId: parsed.data.branchId }),
      auditId,
      JSON.stringify({ dealId, branchId: parsed.data.branchId }),
    )
    .run();

  if ((result.meta.changes ?? 0) !== 1) {
    return NextResponse.json(
      {
        error: {
          code: 'CLAIM_CONFLICT',
          message: 'Aksiya limiti ayni paytda tugadi. Qayta urinmang.',
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      data: {
        id: redemptionId,
        status: 'CLAIMED',
        code,
        codeHint,
        expiresAt,
        replayed: false,
      },
    },
    { status: 201 },
  );
}
