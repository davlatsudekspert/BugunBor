import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getActiveDealBySlug } from '@/modules/catalog/repository';
import { toStoredUtc } from '@/lib/time';
import { ensureDatabase, getDb } from '@/db/runtime';
import {
  canAccessBusiness,
  type BusinessRole,
} from '@/modules/auth/authorization';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import {
  canDeleteDeal,
  evaluateDealEditPolicy,
  type DealLifecycleStatus,
} from '@/modules/deals/policy';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const deal = await getActiveDealBySlug(id);
  if (!deal)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Aksiya topilmadi.' } },
      { status: 404 },
    );
  return NextResponse.json(
    { data: deal },
    {
      headers: {
        'cache-control': 'public, max-age=15, stale-while-revalidate=60',
      },
    },
  );
}

const patchSchema = z.object({
  title: z.string().trim().min(6).max(160).optional(),
  categoryId: z.string().min(1).max(60).optional(),
  attributes: z.record(z.string(), z.string().max(120)).optional(),
  imageUrls: z.array(z.url().max(600)).min(2).max(6).optional(),
  discountedPriceUzs: z.number().int().min(1000).max(1_000_000_000).optional(),
  totalQuantity: z.number().int().min(0).max(1_000_000).nullable().optional(),
  startsAt: z.string().min(10).optional(),
  endsAt: z.string().min(10).optional(),
  description: z.string().trim().min(20).max(2000).optional(),
  terms: z.string().trim().min(10).max(2000).optional(),
});

type DealRow = {
  businessId: string;
  status: DealLifecycleStatus;
  discountedPriceUzs: number;
  totalQuantity: number | null;
  remainingQuantity: number | null;
  originalPriceUzs: number | null;
  startsAt: string;
  endsAt: string;
};

async function loadDealForEdit(db: ReturnType<typeof getDb>, dealId: string) {
  return db
    .prepare(`SELECT business_id AS "businessId", status, discounted_price_uzs AS "discountedPriceUzs",
        total_quantity AS "totalQuantity", remaining_quantity AS "remainingQuantity",
        original_price_uzs AS "originalPriceUzs", starts_at AS "startsAt", ends_at AS "endsAt"
      FROM deals WHERE id = ?1 AND deleted_at IS NULL`)
    .bind(dealId)
    .first<DealRow>();
}

async function assertDealWriteAccess(
  db: ReturnType<typeof getDb>,
  businessId: string,
  userId: string,
) {
  const membership = await db
    .prepare(
      'SELECT role FROM business_members WHERE business_id = ?1 AND user_id = ?2 AND revoked_at IS NULL',
    )
    .bind(businessId, userId)
    .first<{ role: BusinessRole }>();
  if (!membership) return false;
  return canAccessBusiness({
    requestedBusinessId: businessId,
    membershipBusinessId: businessId,
    role: membership.role,
    action: 'deal.write',
  });
}

export async function PATCH(
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

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          message: 'Ma’lumotlarni tekshiring.',
          fields: z.treeifyError(parsed.error),
        },
      },
      { status: 422 },
    );
  const patch = parsed.data;
  // Normalize to the naive-UTC form every stored timestamp uses (see lib/time.ts)
  // before it reaches either the edit policy check or the SQL bind below.
  if (patch.startsAt !== undefined)
    patch.startsAt = toStoredUtc(patch.startsAt);
  if (patch.endsAt !== undefined) patch.endsAt = toStoredUtc(patch.endsAt);

  await ensureDatabase();
  const db = getDb();
  const { id: dealId } = await context.params;
  const deal = await loadDealForEdit(db, dealId);
  if (!deal)
    return NextResponse.json(
      { error: { message: 'E’lon topilmadi.' } },
      { status: 404 },
    );
  if (!(await assertDealWriteAccess(db, deal.businessId, identity.id))) {
    return NextResponse.json(
      { error: { message: 'Ushbu e’lonni tahrirlash ruxsati yo‘q.' } },
      { status: 403 },
    );
  }

  const policy = evaluateDealEditPolicy(deal, patch);
  if (!policy.ok) return NextResponse.json({ error: policy }, { status: 409 });

  const before = JSON.stringify(deal);
  const sets: string[] = [];
  const values: unknown[] = [];
  let placeholder = 1;

  if (patch.title !== undefined) {
    sets.push(`title = ?${placeholder++}`);
    values.push(patch.title);
  }
  if (patch.categoryId !== undefined) {
    sets.push(`category_id = ?${placeholder++}`);
    values.push(patch.categoryId);
  }
  if (patch.attributes !== undefined) {
    sets.push(`attributes_json = ?${placeholder++}`);
    values.push(JSON.stringify(patch.attributes));
  }
  if (patch.description !== undefined) {
    sets.push(`description = ?${placeholder++}`);
    values.push(patch.description);
  }
  if (patch.terms !== undefined) {
    sets.push(`terms = ?${placeholder++}`);
    values.push(patch.terms);
  }
  if (patch.startsAt !== undefined) {
    sets.push(`starts_at = ?${placeholder++}`);
    values.push(patch.startsAt);
  }
  if (patch.endsAt !== undefined) {
    sets.push(`ends_at = ?${placeholder++}`);
    values.push(patch.endsAt);
  }
  if (patch.discountedPriceUzs !== undefined) {
    sets.push(`discounted_price_uzs = ?${placeholder++}`);
    values.push(patch.discountedPriceUzs);
    if (deal.originalPriceUzs) {
      sets.push(`discount_percent = ?${placeholder++}`);
      values.push(
        Math.round(
          ((deal.originalPriceUzs - patch.discountedPriceUzs) /
            deal.originalPriceUzs) *
            100,
        ),
      );
    }
  }
  if (patch.totalQuantity !== undefined) {
    sets.push(`total_quantity = ?${placeholder++}`);
    values.push(patch.totalQuantity);
    // Grow remaining_quantity by the same delta so already-claimed units stay claimed.
    const delta =
      deal.totalQuantity === null || patch.totalQuantity === null
        ? 0
        : patch.totalQuantity - deal.totalQuantity;
    sets.push(
      `remaining_quantity = CASE WHEN remaining_quantity IS NULL THEN NULL ELSE remaining_quantity + ?${placeholder} END`,
    );
    values.push(delta);
    placeholder++;
  }

  const statements = [] as ReturnType<typeof db.prepare>[];
  if (sets.length > 0) {
    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(dealId);
    statements.push(
      db
        .prepare(
          `UPDATE deals SET ${sets.join(', ')} WHERE id = ?${placeholder}`,
        )
        .bind(...values),
    );
  }
  if (patch.imageUrls !== undefined) {
    statements.push(
      db.prepare('DELETE FROM deal_images WHERE deal_id = ?1').bind(dealId),
    );
    patch.imageUrls.forEach((url, index) => {
      statements.push(
        db
          .prepare(
            'INSERT INTO deal_images(id, deal_id, url, sort_order, is_cover) VALUES (?1, ?2, ?3, ?4, ?5)',
          )
          .bind(crypto.randomUUID(), dealId, url, index, index === 0 ? 1 : 0),
      );
    });
  }
  statements.push(
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json, after_json)
      VALUES (?1, ?2, ?3, 'deal.edited', 'Deal', ?4, ?5, ?6)`)
      .bind(
        crypto.randomUUID(),
        identity.id,
        deal.businessId,
        dealId,
        before,
        JSON.stringify(patch),
      ),
  );

  await db.batch(statements);
  return NextResponse.json({ data: { id: dealId, updated: true } });
}

export async function DELETE(
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
  const deal = await loadDealForEdit(db, dealId);
  if (!deal)
    return NextResponse.json(
      { error: { message: 'E’lon topilmadi.' } },
      { status: 404 },
    );
  if (!(await assertDealWriteAccess(db, deal.businessId, identity.id))) {
    return NextResponse.json(
      { error: { message: 'Ushbu e’lonni o‘chirish ruxsati yo‘q.' } },
      { status: 403 },
    );
  }

  const policy = canDeleteDeal(deal.status);
  if (!policy.ok) return NextResponse.json({ error: policy }, { status: 409 });

  await db.batch([
    db
      .prepare(
        `UPDATE deals SET status = 'ARCHIVED', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?1`,
      )
      .bind(dealId),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json)
      VALUES (?1, ?2, ?3, 'deal.deleted', 'Deal', ?4, ?5)`)
      .bind(
        crypto.randomUUID(),
        identity.id,
        deal.businessId,
        dealId,
        JSON.stringify(deal),
      ),
  ]);
  return NextResponse.json({ data: { id: dealId, status: 'ARCHIVED' } });
}
