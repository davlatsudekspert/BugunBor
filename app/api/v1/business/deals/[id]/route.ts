import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, syncDealLifecycle } from '@/db/runtime';
import { toStoredUtc } from '@/lib/time';
import { getManagedDeal } from '@/modules/catalog/ownership';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const PRE_LAUNCH_STATUSES = new Set(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'SCHEDULED']);

// A compressed JPEG data URL — see lib/image.ts's compressImageToDataUrl(), the only thing
// that ever produces one client-side. The length cap mirrors its own, as a second,
// server-side backstop rather than trusting the client did its job. Swapping the photo is
// cosmetic, unlike price/quantity/date, so it's allowed both before and after launch.
const imageUrlField = z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/).max(900_000).optional();

/**
 * Everything is editable before a deal opens. Only zeros-in the deal is
 * launched (see postLaunchSchema): the promised price and end date are a
 * promise to customers, not a suggestion.
 */
const preLaunchSchema = z.object({
  categoryId: z.enum(['cat_food', 'cat_coffee', 'cat_shop', 'cat_delivery']).optional(),
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().min(20).max(1200).optional(),
  terms: z.string().trim().min(10).max(800).optional(),
  originalPriceUzs: z.coerce.number().int().min(0).optional(),
  discountedPriceUzs: z.coerce.number().int().min(100).max(500_000_000).optional(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  totalQuantity: z.coerce.number().int().min(1).max(100_000).optional(),
  perCustomerLimit: z.coerce.number().int().min(1).max(20).optional(),
  redemptionMethod: z.enum(['ONSITE_CODE', 'ONLINE_VOUCHER']).optional(),
  imageUrl: imageUrlField,
});

/**
 * Once live, a deal can only move in the customer's favor: a lower price, more
 * stock, or an earlier end. It can never get more expensive, sell fewer units
 * than already promised, or run longer than advertised — the same trust rule
 * as /rules: what customers saw when they clicked in must still hold.
 */
const postLaunchSchema = z.object({
  discountedPriceUzs: z.coerce.number().int().min(100).max(500_000_000).optional(),
  totalQuantity: z.coerce.number().int().min(1).max(100_000).optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  imageUrl: imageUrlField,
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  await ensurePhase1Database();
  await syncDealLifecycle();
  const db = getD1();
  const { id } = await context.params;
  const managed = await getManagedDeal(db, identity.id, id, 'deal.write');
  if (!managed) return NextResponse.json({ error: { message: 'Aksiya topilmadi.' } }, { status: 404 });
  const { business, deal } = managed;

  const isPreLaunch = PRE_LAUNCH_STATUSES.has(deal.status);
  const isLive = deal.status === 'ACTIVE';
  if (!isPreLaunch && !isLive) {
    return NextResponse.json({ error: { message: 'Bu aksiya endi tahrirlanmaydi (holati: ' + deal.status + ').' } }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = isPreLaunch ? preLaunchSchema.safeParse(body) : postLaunchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.issues[0]?.message ?? 'Ma’lumotlarni tekshiring.' } }, { status: 422 });
  if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: { message: 'O‘zgartiriladigan maydonni ko‘rsating.' } }, { status: 422 });

  const sets: string[] = [];
  const binds: unknown[] = [];
  let position = 1;
  const set = (column: string, value: unknown) => {
    sets.push(`${column} = ?${position}`);
    binds.push(value);
    position += 1;
  };

  if (isPreLaunch) {
    const data = parsed.data as z.infer<typeof preLaunchSchema>;
    const nextOriginal = data.originalPriceUzs ?? deal.originalPriceUzs ?? undefined;
    const nextDiscounted = data.discountedPriceUzs ?? deal.discountedPriceUzs;
    if (nextOriginal && nextDiscounted >= nextOriginal) {
      return NextResponse.json({ error: { message: 'Chegirmali narx eski narxdan past bo‘lishi shart — soxta chegirma taqiqlanadi.' } }, { status: 422 });
    }
    const nextStartsAt = data.startsAt ? toStoredUtc(data.startsAt) : deal.startsAt;
    const nextEndsAt = data.endsAt ? toStoredUtc(data.endsAt) : deal.endsAt;
    if (nextEndsAt <= nextStartsAt) return NextResponse.json({ error: { message: 'Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak.' } }, { status: 422 });

    if (data.categoryId !== undefined) set('category_id', data.categoryId);
    if (data.title !== undefined) set('title', data.title);
    if (data.description !== undefined) set('description', data.description);
    if (data.terms !== undefined) set('terms', data.terms);
    if (data.originalPriceUzs !== undefined) set('original_price_uzs', data.originalPriceUzs);
    if (data.discountedPriceUzs !== undefined) {
      const discountPercent = nextOriginal ? Math.round(((nextOriginal - nextDiscounted) / nextOriginal) * 100) : 0;
      set('discounted_price_uzs', data.discountedPriceUzs);
      set('discount_percent', discountPercent);
    }
    if (data.startsAt !== undefined) set('starts_at', nextStartsAt);
    if (data.endsAt !== undefined) set('ends_at', nextEndsAt);
    if (data.totalQuantity !== undefined) {
      // Pre-launch, nothing has been claimed yet, so remaining always tracks total exactly.
      set('total_quantity', data.totalQuantity);
      set('remaining_quantity', data.totalQuantity);
    }
    if (data.perCustomerLimit !== undefined) set('per_customer_limit', data.perCustomerLimit);
    if (data.redemptionMethod !== undefined) set('redemption_method', data.redemptionMethod);
    if (data.imageUrl !== undefined) set('image_url', data.imageUrl);
    // A fixed typo/rejection reason is worth a second look — resubmit it rather than leaving it stuck forever.
    if (deal.status === 'REJECTED') set('status', 'PENDING_REVIEW');
  } else {
    const data = parsed.data as z.infer<typeof postLaunchSchema>;
    if (data.discountedPriceUzs !== undefined) {
      if (data.discountedPriceUzs >= deal.discountedPriceUzs) {
        return NextResponse.json({ error: { message: 'Faol aksiyada narxni faqat pasaytirish mumkin.' } }, { status: 422 });
      }
      if (deal.originalPriceUzs && data.discountedPriceUzs >= deal.originalPriceUzs) {
        return NextResponse.json({ error: { message: 'Chegirmali narx eski narxdan past bo‘lishi shart.' } }, { status: 422 });
      }
      const discountPercent = deal.originalPriceUzs ? Math.round(((deal.originalPriceUzs - data.discountedPriceUzs) / deal.originalPriceUzs) * 100) : 0;
      set('discounted_price_uzs', data.discountedPriceUzs);
      set('discount_percent', discountPercent);
    }
    if (data.totalQuantity !== undefined) {
      if (deal.totalQuantity === null) return NextResponse.json({ error: { message: 'Miqdor cheklanmagan aksiyada bu maydon o‘zgartirilmaydi.' } }, { status: 422 });
      if (data.totalQuantity <= deal.totalQuantity) return NextResponse.json({ error: { message: 'Faol aksiyada miqdorni faqat ko‘paytirish mumkin.' } }, { status: 422 });
      const addedUnits = data.totalQuantity - deal.totalQuantity;
      set('total_quantity', data.totalQuantity);
      set('remaining_quantity', (deal.remainingQuantity ?? 0) + addedUnits);
    }
    if (data.endsAt !== undefined) {
      const nextEndsAt = toStoredUtc(data.endsAt);
      if (nextEndsAt >= deal.endsAt) return NextResponse.json({ error: { message: 'Faol aksiyada tugash vaqtini faqat oldinga (erta tugatish) o‘zgartirish mumkin.' } }, { status: 422 });
      if (nextEndsAt <= deal.startsAt) return NextResponse.json({ error: { message: 'Tugash vaqti hozirdan keyin bo‘lishi kerak — darhol to‘xtatish uchun "To‘xtatish" tugmasidan foydalaning.' } }, { status: 422 });
      set('ends_at', nextEndsAt);
    }
    if (data.imageUrl !== undefined) set('image_url', data.imageUrl);
  }

  if (sets.length === 0) return NextResponse.json({ error: { message: 'O‘zgartiriladigan maydonni ko‘rsating.' } }, { status: 422 });

  set('updated_at', new Date().toISOString().slice(0, 19).replace('T', ' '));
  binds.push(id, business.id);
  await db.batch([
    db.prepare(`UPDATE deals SET ${sets.join(', ')} WHERE id = ?${position} AND business_id = ?${position + 1}`).bind(...binds),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
        VALUES (?1, ?2, ?3, 'deal.edited', 'Deal', ?4, ?5)`)
      .bind(crypto.randomUUID(), identity.id, business.id, id, JSON.stringify(parsed.data)),
  ]);

  return NextResponse.json({ data: { id } });
}
