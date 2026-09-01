import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { toStoredUtc } from '@/lib/time';
import { getOwnedBusiness } from '@/modules/catalog/ownership';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

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
    listingType: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
    minPriceUzs: z.coerce.number().int().min(0).optional(),
    businessId: z.string().min(1).max(100).optional(),
    // A compressed JPEG data URL — see lib/image.ts's compressImageToDataUrl(), which is the
    // only thing that ever produces one client-side. The length cap mirrors its own, as a
    // second, server-side backstop rather than trusting the client did its job.
    imageUrl: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/).max(900_000).optional(),
    autoDiscountTiers: z.array(z.object({ afterHours: z.coerce.number().min(0).max(1000), discountPercent: z.coerce.number().int().min(1).max(95) })).max(6).optional(),
    timeSlots: z.array(z.object({ startsAt: z.iso.datetime({ offset: true }), capacity: z.coerce.number().int().min(1).max(500) })).max(50).optional(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), { message: 'Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak.', path: ['endsAt'] })
  .refine((data) => !data.originalPriceUzs || data.discountedPriceUzs < data.originalPriceUzs, {
    message: 'Chegirmali narx eski narxdan past bo‘lishi shart — soxta chegirma taqiqlanadi.',
    path: ['discountedPriceUzs'],
  })
  .refine((data) => !data.autoDiscountTiers?.length || Boolean(data.originalPriceUzs), {
    message: 'Avto Skidka uchun eski narx ko‘rsatilishi shart.',
    path: ['autoDiscountTiers'],
  })
  .refine((data) => {
    if (!data.autoDiscountTiers?.length) return true;
    const hours = data.autoDiscountTiers.map((tier) => tier.afterHours);
    return hours.every((hour, index) => index === 0 || hour > hours[index - 1]);
  }, { message: 'Avto Skidka bosqichlari vaqt bo‘yicha o‘sib borishi kerak.', path: ['autoDiscountTiers'] })
  .refine((data) => {
    if (!data.autoDiscountTiers?.length) return true;
    const durationHours = (new Date(data.endsAt).getTime() - new Date(data.startsAt).getTime()) / (60 * 60 * 1000);
    return data.autoDiscountTiers.every((tier) => tier.afterHours < durationHours);
  }, { message: 'Avto Skidka bosqichi aksiya muddatidan oshmasligi kerak.', path: ['autoDiscountTiers'] })
  .refine((data) => {
    if (!data.timeSlots?.length) return true;
    const startsAtMs = new Date(data.startsAt).getTime();
    const endsAtMs = new Date(data.endsAt).getTime();
    return data.timeSlots.every((slot) => {
      const slotMs = new Date(slot.startsAt).getTime();
      return slotMs >= startsAtMs && slotMs < endsAtMs;
    });
  }, { message: 'Vaqt-slot aksiya muddati ichida bo‘lishi kerak.', path: ['timeSlots'] });

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

  const parsed = dealSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.issues[0]?.message ?? 'Ma’lumotlarni tekshiring.' } }, { status: 422 });

  // ?business=/a hidden form field lets an owner of more than one business pick which one —
  // omitting it falls back to the newest membership, same as before, so a single-business
  // owner sees no change.
  const business = await getOwnedBusiness(db, identity.id, 'deal.write', parsed.data.businessId);
  if (!business) return NextResponse.json({ error: { message: 'Aksiya qo‘shish uchun ruxsat yo‘q.' } }, { status: 403 });
  if (business.verificationStatus !== 'VERIFIED') {
    return NextResponse.json({ error: { message: 'Aksiya qo‘shish uchun avval biznes profili moderator tomonidan tasdiqlanishi kerak.' } }, { status: 403 });
  }

  const branch = await db.prepare('SELECT id FROM branches WHERE id = ?1 AND business_id = ?2 AND deleted_at IS NULL').bind(parsed.data.branchId, business.id).first<{ id: string }>();
  if (!branch) return NextResponse.json({ error: { message: 'Filial ushbu biznesga tegishli emas.' } }, { status: 422 });

  // Bepul (FREE) reja bir vaqtda 2 tagacha faol aksiyaga cheklangan — Pro reja cheksiz (see
  // plans.features_json seed data and components/business-plan-panel.tsx, which show the same
  // limit). Only an ACTIVE Pro subscription lifts it; a lapsed one (PAST_DUE/CANCELED) falls
  // back to the FREE cap, same gate POST /api/v1/admin/deals/:id/sponsor already uses.
  const planRow = await db
    .prepare(`SELECT plan_id AS planId, subscription_status AS subscriptionStatus FROM businesses WHERE id = ?1`)
    .bind(business.id)
    .first<{ planId: string; subscriptionStatus: string }>();
  const isProActive = planRow?.planId === 'plan_pro' && planRow.subscriptionStatus === 'ACTIVE';
  if (!isProActive) {
    const openDeals = await db
      .prepare(`SELECT COUNT(*) AS n FROM deals WHERE business_id = ?1 AND deleted_at IS NULL AND status IN ('PENDING_REVIEW','SCHEDULED','ACTIVE')`)
      .bind(business.id)
      .first<{ n: number }>();
    if ((openDeals?.n ?? 0) >= 2) {
      return NextResponse.json({ error: { message: 'Bepul rejada bir vaqtda faqat 2 tagacha faol aksiya bo‘lishi mumkin. Pro rejaga o‘ting yoki mavjud aksiyalardan birini yakunlang.' } }, { status: 409 });
    }
  }

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

  // Auto Skidka tiers are stored as absolute timestamps; the business only enters "N hours after
  // the deal starts", so each tier's window is [dealStart + afterHours, next tier's start or dealEnd).
  const dealStartsAtMs = new Date(parsed.data.startsAt).getTime();
  const dealEndsAtIso = toStoredUtc(parsed.data.endsAt);
  const tierStatements = (parsed.data.autoDiscountTiers ?? []).map((tier, index, tiers) => {
    const startsAt = new Date(dealStartsAtMs + tier.afterHours * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const endsAt = index + 1 < tiers.length
      ? new Date(dealStartsAtMs + tiers[index + 1].afterHours * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
      : dealEndsAtIso;
    return db
      .prepare(`INSERT INTO deal_discount_tiers(id, deal_id, starts_at, ends_at, discount_percent) VALUES (?1, ?2, ?3, ?4, ?5)`)
      .bind(crypto.randomUUID(), dealId, startsAt, endsAt, tier.discountPercent);
  });

  const timeSlotStatements = (parsed.data.timeSlots ?? []).map((slot) =>
    db
      .prepare(`INSERT INTO deal_time_slots(id, deal_id, starts_at, capacity, remaining_capacity) VALUES (?1, ?2, ?3, ?4, ?4)`)
      .bind(crypto.randomUUID(), dealId, toStoredUtc(slot.startsAt), slot.capacity),
  );

  await db.batch([
    db
      .prepare(`INSERT INTO deals(id, business_id, category_id, slug, title, description, terms, original_price_uzs, discounted_price_uzs, discount_percent, starts_at, ends_at, total_quantity, remaining_quantity, per_customer_limit, redemption_method, status, created_by_id, listing_type, min_price_uzs, image_url)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14, ?15, 'PENDING_REVIEW', ?16, ?17, ?18, ?19)`)
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
        dealEndsAtIso,
        parsed.data.totalQuantity ?? null,
        parsed.data.perCustomerLimit,
        parsed.data.redemptionMethod,
        identity.id,
        parsed.data.listingType,
        parsed.data.minPriceUzs ?? null,
        parsed.data.imageUrl ?? null,
      ),
    db.prepare(`INSERT INTO deal_branches(deal_id, branch_id) VALUES (?1, ?2)`).bind(dealId, parsed.data.branchId),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
        VALUES (?1, ?2, ?3, 'deal.submitted', 'Deal', ?4, ?5)`)
      .bind(auditId, identity.id, business.id, dealId, JSON.stringify({ title: parsed.data.title, discountPercent, status: 'PENDING_REVIEW' })),
    ...tierStatements,
    ...timeSlotStatements,
  ]);

  return NextResponse.json({ data: { id: dealId, slug, status: 'PENDING_REVIEW' } }, { status: 201 });
}
