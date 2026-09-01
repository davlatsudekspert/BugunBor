import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { buildPaymeCheckoutUrl, isPaymeConfigured } from '@/modules/billing/payme';
import { computeEffectivePlanPriceUzs } from '@/modules/billing/nfcstore-discount';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import { getOwnedBusiness } from '@/modules/catalog/ownership';

const bodySchema = z.object({ businessId: z.string().min(1).max(100).optional() });

/**
 * A business owner requesting to buy the Pro plan. Creates a PENDING business_plan_orders row
 * and returns a real Payme checkout redirect (modules/billing/payme.ts) — never a fabricated
 * "success" response. Without PAYME_MERCHANT_ID/PAYME_SECRET_KEY configured, this 503s with a
 * clear message instead, exactly like modules/providers/development.ts's payment provider
 * throws rather than pretending a payment went through.
 */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Ma’lumotlarni tekshiring.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();

  const business = await getOwnedBusiness(db, identity.id, 'plan.manage', parsed.data.businessId);
  if (!business) return NextResponse.json({ error: { message: 'Reja sotib olish uchun ruxsat yo‘q.' } }, { status: 403 });

  const current = await db
    .prepare(`SELECT plan_id AS planId, subscription_status AS subscriptionStatus, nfcstore_discount_eligible AS nfcstoreDiscountEligible FROM businesses WHERE id = ?1`)
    .bind(business.id)
    .first<{ planId: string; subscriptionStatus: string; nfcstoreDiscountEligible: number }>();
  if (current?.planId === 'plan_pro' && current.subscriptionStatus === 'ACTIVE') {
    return NextResponse.json({ error: { message: 'Siz allaqachon Pro rejadasiz.' } }, { status: 409 });
  }

  const proPlan = await db.prepare(`SELECT id, price_uzs AS priceUzs FROM plans WHERE code = 'PRO' AND is_active = 1`).first<{ id: string; priceUzs: number }>();
  if (!proPlan) return NextResponse.json({ error: { message: 'Pro reja hozircha mavjud emas.' } }, { status: 409 });

  if (!isPaymeConfigured()) {
    return NextResponse.json({ error: { message: 'To‘lov tizimi hali ulanmagan. Iltimos, admin bilan bog‘laning.' } }, { status: 503 });
  }

  const { finalPriceUzs } = computeEffectivePlanPriceUzs(proPlan.priceUzs, Boolean(current?.nfcstoreDiscountEligible));
  const orderId = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO business_plan_orders(id, business_id, plan_id, amount_uzs, status, created_by_id) VALUES (?1, ?2, ?3, ?4, 'PENDING', ?5)`)
    .bind(orderId, business.id, proPlan.id, finalPriceUzs, identity.id)
    .run();

  const checkoutUrl = buildPaymeCheckoutUrl(orderId, finalPriceUzs);
  return NextResponse.json({ data: { orderId, checkoutUrl, amountUzs: finalPriceUzs } }, { status: 201 });
}
