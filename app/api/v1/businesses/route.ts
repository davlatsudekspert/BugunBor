import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureDatabase, getDb } from '@/db/runtime';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const businessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(1200),
  categoryId: z.enum([
    'cat_food',
    'cat_coffee',
    'cat_shop',
    'cat_delivery',
    'cat_service',
  ]),
  city: z.enum(['Toshkent', 'Samarqand', 'Buxoro']),
  address: z.string().trim().min(8).max(240),
  phone: z.string().regex(/^\+998\d{9}$/),
});

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 54) || 'biznes'
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
  const identity = await getRequestIdentity(request);
  if (!identity)
    return NextResponse.json(
      { error: { message: 'Davom etish uchun tizimga kiring.' } },
      { status: 401 },
    );
  const parsed = businessSchema.safeParse(
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

  await ensureDatabase();
  const db = getDb();
  const businessId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const suffix = businessId.slice(0, 6);
  const slug = `${slugify(parsed.data.name)}-${suffix}`;
  const latitudeE6 =
    parsed.data.city === 'Samarqand'
      ? 39654200
      : parsed.data.city === 'Buxoro'
        ? 39774200
        : 41311200;
  const longitudeE6 =
    parsed.data.city === 'Samarqand'
      ? 66959200
      : parsed.data.city === 'Buxoro'
        ? 64428200
        : 69279300;

  await db.batch([
    db
      .prepare(`INSERT INTO businesses(id, slug, name, description, city, category_id, phone, verification_status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'PENDING')`)
      .bind(
        businessId,
        slug,
        parsed.data.name,
        parsed.data.description,
        parsed.data.city,
        parsed.data.categoryId,
        parsed.data.phone,
      ),
    db
      .prepare(`INSERT INTO branches(id, business_id, name, city, address, latitude_e6, longitude_e6, phone, working_hours_json)
      VALUES (?1, ?2, 'Asosiy filial', ?3, ?4, ?5, ?6, ?7, '{"mon-sat":"09:00-20:00"}')`)
      .bind(
        branchId,
        businessId,
        parsed.data.city,
        parsed.data.address,
        latitudeE6,
        longitudeE6,
        parsed.data.phone,
      ),
    db
      .prepare(
        `INSERT INTO business_members(business_id, user_id, role) VALUES (?1, ?2, 'OWNER')`,
      )
      .bind(businessId, identity.id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
      VALUES (?1, ?2, ?3, 'business.onboarding_submitted', 'Business', ?3, ?4)`)
      .bind(
        auditId,
        identity.id,
        businessId,
        JSON.stringify({
          name: parsed.data.name,
          verificationStatus: 'PENDING',
        }),
      ),
  ]);

  return NextResponse.json(
    {
      data: {
        id: businessId,
        slug,
        status: 'PENDING',
        next: '/business/dashboard',
      },
    },
    { status: 201 },
  );
}
