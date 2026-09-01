import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { validateNfcStoreProfileUrl } from '@/lib/nfcstore';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';
import { getOwnedBusiness } from '@/modules/catalog/ownership';

const bodySchema = z.object({ businessId: z.string().min(1).max(100), nfcstoreBusinessUrl: z.string().trim().min(1).max(300) });

/**
 * Connects (or re-connects) a business's NFCStore Business profile from the business cabinet
 * (/business/dashboard) — the ongoing-management counterpart to the optional field on
 * /business/onboarding (POST /api/v1/businesses). Any new or changed link always resets
 * verification: connecting doesn't verify anything by itself (see
 * modules/integrations/nfcstore-verification.ts) — an admin has to confirm it by hand via
 * POST /api/v1/admin/businesses/:id/nfcstore-decision before the 10% plan discount activates.
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
  if (!parsed.success) return NextResponse.json({ error: { message: 'Havolani kiriting.' } }, { status: 422 });

  const validation = validateNfcStoreProfileUrl(parsed.data.nfcstoreBusinessUrl);
  if (!validation.ok) return NextResponse.json({ error: { message: validation.reason } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const business = await getOwnedBusiness(db, identity.id, 'nfcstore.manage', parsed.data.businessId);
  if (!business) return NextResponse.json({ error: { message: 'Ruxsat yo‘q.' } }, { status: 403 });

  const current = await db.prepare(`SELECT nfcstore_business_url AS url, nfcstore_status AS status FROM businesses WHERE id = ?1`).bind(business.id).first<{ url: string | null; status: string }>();
  // Resubmitting the exact same, already-connected link is a no-op — don't restart
  // verification for nothing.
  if (current?.url === validation.normalizedUrl) {
    return NextResponse.json({ data: { nfcstoreBusinessUrl: validation.normalizedUrl, nfcstoreStatus: current.status } });
  }

  try {
    await db.batch([
      db
        .prepare(`UPDATE businesses SET nfcstore_business_url = ?1, nfcstore_status = 'PENDING_VERIFICATION', nfcstore_verified_at = NULL, nfcstore_discount_eligible = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?2`)
        .bind(validation.normalizedUrl, business.id),
      db
        .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json, after_json)
          VALUES (?1, ?2, ?3, 'business.nfcstore_connected', 'Business', ?3, ?4, ?5)`)
        .bind(crypto.randomUUID(), identity.id, business.id, JSON.stringify({ nfcstoreBusinessUrl: current?.url ?? null }), JSON.stringify({ nfcstoreBusinessUrl: validation.normalizedUrl })),
    ]);
  } catch (error) {
    if (error instanceof Error && /unique/i.test(error.message)) {
      return NextResponse.json({ error: { message: 'Bu NFCStore Business profili allaqachon boshqa biznesga bog‘langan.' } }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ data: { nfcstoreBusinessUrl: validation.normalizedUrl, nfcstoreStatus: 'PENDING_VERIFICATION' } });
}

const disconnectSchema = z.object({ businessId: z.string().min(1).max(100) });

/** Voluntarily disconnects — the discount, if it was active, stops from the next billing read onward (see modules/billing/nfcstore-discount.ts); nothing already billed changes. */
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });

  const parsed = disconnectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Biznes ko‘rsatilmagan.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const business = await getOwnedBusiness(db, identity.id, 'nfcstore.manage', parsed.data.businessId);
  if (!business) return NextResponse.json({ error: { message: 'Ruxsat yo‘q.' } }, { status: 403 });

  const current = await db.prepare(`SELECT nfcstore_business_url AS url FROM businesses WHERE id = ?1`).bind(business.id).first<{ url: string | null }>();

  await db.batch([
    db
      .prepare(`UPDATE businesses SET nfcstore_business_url = NULL, nfcstore_status = 'DISCONNECTED', nfcstore_discount_eligible = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1`)
      .bind(business.id),
    db
      .prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, before_json)
        VALUES (?1, ?2, ?3, 'business.nfcstore_disconnected', 'Business', ?3, ?4)`)
      .bind(crypto.randomUUID(), identity.id, business.id, JSON.stringify({ nfcstoreBusinessUrl: current?.url ?? null })),
  ]);

  return NextResponse.json({ data: { nfcstoreStatus: 'DISCONNECTED' } });
}
