import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, mirrorAdminAsPlatformUser } from '@/db/runtime';
import { toStoredUtc } from '@/lib/time';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,24}$/, 'Kod faqat lotin harflari va raqamlardan, 4-24 belgi.'),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.coerce.number().int().min(1),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  if (!admin || !canAdmin(admin.role, 'admin.promocodes.manage')) {
    return NextResponse.json({ error: { message: 'Promokodlar ustidan ruxsat talab qilinadi.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Promokod ma’lumotlarini tekshiring.', fields: z.treeifyError(parsed.error) } }, { status: 422 });
  if (parsed.data.discountType === 'PERCENT' && parsed.data.discountValue > 95) {
    return NextResponse.json({ error: { message: 'Foizli chegirma 95% dan oshmasligi kerak.' } }, { status: 422 });
  }

  await ensurePhase1Database();
  const db = getD1();
  const existing = await db.prepare(`SELECT id FROM promo_codes WHERE code = ?1`).bind(parsed.data.code).first();
  if (existing) return NextResponse.json({ error: { message: 'Bu kod allaqachon mavjud.' } }, { status: 409 });

  await mirrorAdminAsPlatformUser(db, { id: admin.id, displayName: admin.displayName, role: admin.role });
  const id = crypto.randomUUID();
  const expiresAt = parsed.data.expiresAt ? toStoredUtc(parsed.data.expiresAt) : null;
  await db
    .prepare(`INSERT INTO promo_codes(id, code, discount_type, discount_value, max_uses, expires_at, created_by_admin_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(id, parsed.data.code, parsed.data.discountType, parsed.data.discountValue, parsed.data.maxUses ?? null, expiresAt, admin.id)
    .run();

  return NextResponse.json({ data: { id, code: parsed.data.code } }, { status: 201 });
}
