import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { validateNfcStoreProfileUrl } from '@/lib/nfcstore';
import { findRegion, isValidDistrict } from '@/lib/uzbekistan-regions';
import { getRequestIdentity, requireSameOrigin } from '@/modules/auth/identity';

const businessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(1200),
  categoryId: z.enum(['cat_food', 'cat_coffee', 'cat_shop', 'cat_delivery']),
  region: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(8).max(240),
  phone: z.string().regex(/^\+998\d{9}$/),
  acceptedRules: z.literal('on', { message: 'Qoidalarga rozilik shart.' }),
  // Optional — see lib/nfcstore.ts. An empty string from the form means "not provided", same
  // as omitting the field entirely.
  nfcstoreBusinessUrl: z.string().trim().max(300).optional().or(z.literal('')),
});

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 54) || 'biznes';
}

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 }); }
  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: { message: 'Davom etish uchun tizimga kiring.' } }, { status: 401 });
  const parsed = businessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Ma’lumotlarni tekshiring.', fields: z.treeifyError(parsed.error) } }, { status: 422 });

  if (!isValidDistrict(parsed.data.region, parsed.data.city)) {
    return NextResponse.json({ error: { message: 'Viloyat va tuman/shaharni ro‘yxatdan tanlang.' } }, { status: 422 });
  }
  const region = findRegion(parsed.data.region)!;

  let nfcstoreUrl: string | null = null;
  if (parsed.data.nfcstoreBusinessUrl) {
    const validation = validateNfcStoreProfileUrl(parsed.data.nfcstoreBusinessUrl);
    if (!validation.ok) return NextResponse.json({ error: { message: validation.reason } }, { status: 422 });
    nfcstoreUrl = validation.normalizedUrl;
  }

  await ensurePhase1Database();
  const db = getD1();
  const businessId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const suffix = businessId.slice(0, 6);
  const slug = `${slugify(parsed.data.name)}-${suffix}`;
  // Submitting a link doesn't verify it — see modules/integrations/nfcstore-verification.ts.
  // The 10% discount only ever activates once an admin manually confirms it.
  const nfcstoreStatus = nfcstoreUrl ? 'PENDING_VERIFICATION' : 'NOT_CONNECTED';

  const statements = [
    db.prepare(`INSERT INTO businesses(id, slug, name, description, city, region, category_id, phone, verification_status, plan_id, subscription_status, nfcstore_business_url, nfcstore_status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'PENDING', 'plan_free', 'FREE', ?9, ?10)`)
      .bind(businessId, slug, parsed.data.name, parsed.data.description, parsed.data.city, region.name, parsed.data.categoryId, parsed.data.phone, nfcstoreUrl, nfcstoreStatus),
    db.prepare(`INSERT INTO branches(id, business_id, name, city, region, address, latitude_e6, longitude_e6, phone, working_hours_json)
      VALUES (?1, ?2, 'Asosiy filial', ?3, ?4, ?5, ?6, ?7, ?8, '{"mon-sat":"09:00-20:00"}')`)
      .bind(branchId, businessId, parsed.data.city, region.name, parsed.data.address, region.center.latitudeE6, region.center.longitudeE6, parsed.data.phone),
    db.prepare(`INSERT INTO business_members(business_id, user_id, role) VALUES (?1, ?2, 'OWNER')`).bind(businessId, identity.id),
    db.prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
      VALUES (?1, ?2, ?3, 'business.onboarding_submitted', 'Business', ?3, ?4)`)
      .bind(auditId, identity.id, businessId, JSON.stringify({ name: parsed.data.name, verificationStatus: 'PENDING' })),
  ];
  if (nfcstoreUrl) {
    statements.push(
      db.prepare(`INSERT INTO audit_logs(id, actor_user_id, business_id, action, target_type, target_id, after_json)
        VALUES (?1, ?2, ?3, 'business.nfcstore_connected', 'Business', ?3, ?4)`)
        .bind(crypto.randomUUID(), identity.id, businessId, JSON.stringify({ nfcstoreBusinessUrl: nfcstoreUrl })),
    );
  }

  try {
    await db.batch(statements);
  } catch (error) {
    // The partial unique index on nfcstore_business_url rejects a second business claiming an
    // already-linked NFCStore profile — "1 NFCStore Business profile = 1 BugunBor account".
    if (error instanceof Error && /unique/i.test(error.message)) {
      return NextResponse.json({ error: { message: 'Bu NFCStore Business profili allaqachon boshqa biznesga bog‘langan.' } }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ data: { id: businessId, slug, status: 'PENDING', next: '/business/dashboard' } }, { status: 201 });
}
