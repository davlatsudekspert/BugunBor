import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({
  redemptionId: z.string().min(3).max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
});

/**
 * A review requires owning a COMPLETED redemption — staff already confirmed the visit
 * happened by scanning the customer's code, so there is no way to review a business
 * without having actually redeemed something there. `reviews.redemption_id` is UNIQUE,
 * so the same visit can only ever produce one review.
 */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Baholash ma’lumotlarini tekshiring.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const redemption = await db
    .prepare(`SELECT r.id, r.user_id AS userId, r.status, d.business_id AS businessId
      FROM redemptions r JOIN deals d ON d.id = r.deal_id WHERE r.id = ?1`)
    .bind(parsed.data.redemptionId)
    .first<{ id: string; userId: string; status: string; businessId: string }>();

  if (!redemption || redemption.userId !== identity.id) {
    return NextResponse.json({ error: { message: 'Bandlik topilmadi.' } }, { status: 404 });
  }
  if (redemption.status !== 'COMPLETED') {
    return NextResponse.json({ error: { message: 'Faqat foydalanilgan aksiyani baholash mumkin.' } }, { status: 409 });
  }

  const existing = await db.prepare(`SELECT id FROM reviews WHERE redemption_id = ?1`).bind(redemption.id).first();
  if (existing) return NextResponse.json({ error: { message: 'Siz bu bandlikni allaqachon baholagansiz.' } }, { status: 409 });

  const reviewId = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO reviews(id, business_id, user_id, redemption_id, rating, comment) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(reviewId, redemption.businessId, identity.id, redemption.id, parsed.data.rating, parsed.data.comment?.trim() || null)
    .run();

  return NextResponse.json({ data: { id: reviewId } }, { status: 201 });
}
