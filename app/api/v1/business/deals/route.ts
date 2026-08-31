import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { canAccessBusiness, type BusinessRole } from '@/modules/auth/authorization';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

/** Matches the naive "YYYY-MM-DD HH:MM:SS" UTC format SQLite's own datetime() produces, so it stays consistent with every other stored timestamp (read-side code appends 'Z' to it directly). */
function toStoredUtc(isoWithOffset: string) {
  return new Date(isoWithOffset).toISOString().slice(0, 19).replace('T', ' ');
}

const dealSchema = z
  .object({
    branchId: z.string().min(1).max(100),
    categoryId: z.enum(['cat_food', 'cat_coffee', 'cat_shop', 'cat_delivery']),
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().min(20).max(1200),
    terms: z.string().trim().min(10).max(800),
    originalPriceUzs: z.coerce.number().int().min(0).optional(),
    discountedPriceUzs: z.coerce.number().int().min(100).max(500_000_000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    totalQuantity: z.coerce.number().int().min(1).max(100_000).optional(),
    perCustomerLimit: z.coerce.number().int().min(1).max(20).default(1),
    redemptionMethod: z.enum(['ONSITE_CODE', 'ONLINE_VOUCHER']),
    acceptedRules: z.literal('on', { message: 'Qoidalarga rozilik shart.' }),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), { message: 'Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak.', path: ['endsAt'] })
  .refine((data) => !data.originalPriceUzs || data.discountedPriceUzs < data.originalPriceUzs, {
    message: 'Chegirmali narx eski narxdan past bo‘lishi shart — soxta chegirma taqiqlanadi.',
    path: ['discountedPriceUzs'],
  });

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
  const membership = await db
    .prepare(`SELECT bm.business_id AS businessId, bm.role FROM business_members bm WHERE bm.user_id = ?1 AND bm.revoked_at IS NULL ORDER BY bm.created_at DESC LIMIT 1`)
    .bind(identity.id)
    .first<{ businessId: string; role: BusinessRole }>();
  if (!membership || !canAccessBusiness({ requestedBusinessId: membership.businessId, membershipBusinessId: membership.businessId, role: membership.role, action: 'deal.write' })) {
    return NextResponse.json({ error: { message: 'Aksiya qo‘shish uchun ruxsat yo‘q.' } }, { status: 403 });
  }

  const business = await db.prepare('SELECT id, verification_status AS verificationStatus FROM businesses WHERE id = ?1 AND deleted_at IS NULL').bind(membership.businessId).first<{ id: string; verificationStatus: string }>();
  if (!business) return NextResponse.json({ error: { message: 'Biznes topilmadi.' } }, { status: 404 });
  if (business.verificationStatus !== 'VERIFIED') {
    return NextResponse.json({ error: { message: 'Aksiya qo‘shish uchun avval biznes profili moderator tomonidan tasdiqlanishi kerak.' } }, { status: 403 });
  }

  const parsed = dealSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.issues[0]?.message ?? 'Ma’lumotlarni tekshiring.' } }, { status: 422 });

  const branch = await db.prepare('SELECT id FROM branches WHERE id = ?1 AND business_id = ?2 AND deleted_at IS NULL').bind(parsed.data.branchId, business.id).first<{ id: string }>();
  if (!branch) return NextResponse.json({ error: { message: 'Filial ushbu biznesga tegishli emas.' } }, { status: 422 });

  const discountPercent = parsed.data.originalPriceUzs
    ? Math.round(((parsed.data.originalPriceUzs - parsed.data.discountedPriceUzs) / parsed.data.originalPriceUzs) * 100)
    : 0;

  const dealId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const slug = `${parsed.data.title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 54) || 'aksiya'}-${dealId.slice(0, 6)}`;

  await db.batch([
    db
      .prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs, discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14, ?15, 'PENDING_REVIEW', ?16)`)
      .bind(
        dealId,
        business.id,
        parsed.data.categoryId,
        slug,
        parsed.data.title,
        parsed.data.description,
        parsed.data.terms,
        parsed.data.originalPriceUzs ?? null,
        parsed.data.discountedPriceUzs,
        discountPercent,
        toStoredUtc(parsed.data.startsAt),
        toStoredUtc(parsed.data.endsAt),
        parsed.data.totalQuantity ?? null,
        parsed.data.perCustomerLimit,
        parsed.data.redemptionMethod,
        identity.id,
      ),
    db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES (?1, ?2)`).bind(dealId, parsed.data.branchId),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
        VALUES (?1, ?2, ?3, 'deal.submitted', 'Deal', ?4, ?5)`)
      .bind(auditId, identity.id, business.id, dealId, JSON.stringify({ title: parsed.data.title, discountPercent, status: 'PENDING_REVIEW' })),
  ]);

  return NextResponse.json({ data: { id: dealId, slug, status: 'PENDING_REVIEW' } }, { status: 201 });
}
