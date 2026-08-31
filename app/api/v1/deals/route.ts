import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureDatabase, getDb } from '@/db/runtime';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import {
  canAccessBusiness,
  type BusinessRole,
} from '@/modules/auth/authorization';
import { listActiveDeals } from '@/modules/catalog/repository';
import { toStoredUtc } from '@/lib/time';

const querySchema = z.object({
  city: z.string().trim().max(80).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  type: z.enum(['PRODUCT', 'SERVICE']).optional(),
  category: z.string().trim().max(60).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(200).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION',
          message: 'Qidiruv parametrlari noto‘g‘ri.',
        },
      },
      { status: 422 },
    );
  const { lat, lng, radiusKm, type, category, ...rest } = parsed.data;
  const near =
    lat !== undefined && lng !== undefined
      ? { lat, lng, radiusKm: radiusKm ?? 5 }
      : undefined;
  const results = await listActiveDeals({
    ...rest,
    dealType: type,
    categorySlug: category,
    near,
  });
  return NextResponse.json(
    { data: results, page: { count: results.length, nextCursor: null } },
    {
      headers: {
        'cache-control': 'public, max-age=30, stale-while-revalidate=120',
      },
    },
  );
}

const createDealSchema = z
  .object({
    businessId: z.string().min(3).max(100),
    branchId: z.string().min(3).max(100),
    categoryId: z.string().min(1).max(60),
    dealType: z.enum(['PRODUCT', 'SERVICE']),
    title: z.string().trim().min(6).max(160),
    description: z.string().trim().min(20).max(2000),
    terms: z.string().trim().min(10).max(2000),
    originalPriceUzs: z.number().int().min(1000).max(1_000_000_000),
    discountedPriceUzs: z.number().int().min(1000).max(1_000_000_000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    perCustomerLimit: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.null()])
      .default(1),
    redemptionMethod: z
      .enum(['ONSITE_CODE', 'ONLINE_VOUCHER'])
      .default('ONSITE_CODE'),
    imageUrls: z
      .array(z.url().max(600))
      .min(2, 'Kamida 2 ta rasm kerak')
      .max(6, 'Maksimal 6 ta rasm'),
    attributes: z.record(z.string(), z.string().max(120)).optional(),
    totalQuantity: z.number().int().min(1).max(1_000_000).optional(),
    slots: z
      .array(
        z.object({
          startsAt: z.iso.datetime({ offset: true }),
          capacity: z.number().int().min(1).max(500),
        }),
      )
      .max(200)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.endsAt) <= new Date(value.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Tugash vaqti boshlanishdan keyin bo‘lishi kerak.',
      });
    }
    if (value.discountedPriceUzs >= value.originalPriceUzs) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountedPriceUzs'],
        message: 'BugunBor narxi oddiy narxdan past bo‘lishi kerak.',
      });
    }
    if (value.dealType === 'PRODUCT' && value.totalQuantity === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['totalQuantity'],
        message: 'Mahsulot soni ko‘rsatilishi shart.',
      });
    }
    if (
      value.dealType === 'SERVICE' &&
      (!value.slots || value.slots.length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['slots'],
        message: 'Kamida bitta bo‘sh slot ko‘rsatilishi shart.',
      });
    }
  });

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 54) || 'elon'
  );
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: { message: 'So‘rov manbasi tasdiqlanmadi.' } },
      { status: 403 },
    );
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json(
      { error: { message: 'JSON so‘rovi kutilgan.' } },
      { status: 415 },
    );
  }

  const identity = await getRequestIdentity(request);
  if (!identity)
    return NextResponse.json(
      { error: { message: 'Davom etish uchun tizimga kiring.' } },
      { status: 401 },
    );

  const parsed = createDealSchema.safeParse(
    await request.json().catch(() => null),
  );
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
  const input = parsed.data;

  await ensureDatabase();
  const db = getDb();

  const membership = await db
    .prepare(
      'SELECT role FROM business_members WHERE business_id = ?1 AND user_id = ?2 AND revoked_at IS NULL',
    )
    .bind(input.businessId, identity.id)
    .first<{ role: BusinessRole }>();
  if (
    !membership ||
    !canAccessBusiness({
      requestedBusinessId: input.businessId,
      membershipBusinessId: input.businessId,
      role: membership.role,
      action: 'deal.write',
    })
  ) {
    return NextResponse.json(
      { error: { message: 'Ushbu biznes uchun e’lon yaratish ruxsati yo‘q.' } },
      { status: 403 },
    );
  }

  const branch = await db
    .prepare(
      'SELECT id FROM branches WHERE id = ?1 AND business_id = ?2 AND deleted_at IS NULL',
    )
    .bind(input.branchId, input.businessId)
    .first();
  if (!branch)
    return NextResponse.json(
      { error: { message: 'Filial topilmadi.' } },
      { status: 404 },
    );

  const category = await db
    .prepare('SELECT id FROM categories WHERE id = ?1 AND is_active = 1')
    .bind(input.categoryId)
    .first();
  if (!category)
    return NextResponse.json(
      { error: { message: 'Kategoriya topilmadi.' } },
      { status: 404 },
    );

  const dealId = crypto.randomUUID();
  const slug = `${slugify(input.title)}-${dealId.slice(0, 6)}`;
  const discountPercent = Math.round(
    ((input.originalPriceUzs - input.discountedPriceUzs) /
      input.originalPriceUzs) *
      100,
  );
  const totalQuantity =
    input.dealType === 'PRODUCT' ? (input.totalQuantity ?? null) : null;
  const perCustomerLimit = input.perCustomerLimit ?? 999_999; // "cheklanmagan"

  const statements = [
    db
      .prepare(`INSERT INTO deals(
        id, business_id, category_id, slug, deal_type, title, description, terms,
        original_price_uzs, discounted_price_uzs, discount_percent, starts_at, ends_at,
        total_quantity, remaining_quantity, per_customer_limit, redemption_method, status,
        attributes_json, created_by_id
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14, ?15, ?16, 'PENDING_REVIEW', ?17, ?18)`)
      .bind(
        dealId,
        input.businessId,
        input.categoryId,
        slug,
        input.dealType,
        input.title,
        input.description,
        input.terms,
        input.originalPriceUzs,
        input.discountedPriceUzs,
        discountPercent,
        toStoredUtc(input.startsAt),
        toStoredUtc(input.endsAt),
        totalQuantity,
        perCustomerLimit,
        input.redemptionMethod,
        JSON.stringify(input.attributes ?? {}),
        identity.id,
      ),
    db
      .prepare('INSERT INTO deal_branches(deal_id, branch_id) VALUES (?1, ?2)')
      .bind(dealId, input.branchId),
    ...input.imageUrls.map((url, index) =>
      db
        .prepare(
          'INSERT INTO deal_images(id, deal_id, url, sort_order, is_cover) VALUES (?1, ?2, ?3, ?4, ?5)',
        )
        .bind(crypto.randomUUID(), dealId, url, index, index === 0 ? 1 : 0),
    ),
    ...(input.dealType === 'SERVICE'
      ? (input.slots ?? []).map((slot) =>
          db
            .prepare(
              'INSERT INTO service_slots(id, deal_id, starts_at, capacity, remaining_capacity) VALUES (?1, ?2, ?3, ?4, ?4)',
            )
            .bind(
              crypto.randomUUID(),
              dealId,
              toStoredUtc(slot.startsAt),
              slot.capacity,
            ),
        )
      : []),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
      VALUES (?1, ?2, ?3, 'deal.submitted', 'Deal', ?4, ?5)`)
      .bind(
        crypto.randomUUID(),
        identity.id,
        input.businessId,
        dealId,
        JSON.stringify({
          title: input.title,
          dealType: input.dealType,
          status: 'PENDING_REVIEW',
        }),
      ),
  ];

  await db.batch(statements);

  return NextResponse.json(
    { data: { id: dealId, slug, status: 'PENDING_REVIEW' } },
    { status: 201 },
  );
}
