import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, mirrorAdminAsPlatformUser } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({ isActive: z.boolean() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
  if (!parsed.success) return NextResponse.json({ error: { message: 'Ma’lumotlarni tekshiring.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const { id } = await context.params;
  const promoCode = await db.prepare(`SELECT id FROM promo_codes WHERE id = ?1`).bind(id).first();
  if (!promoCode) return NextResponse.json({ error: { message: 'Promokod topilmadi.' } }, { status: 404 });

  await mirrorAdminAsPlatformUser(db, { id: admin.id, displayName: admin.displayName, role: admin.role });
  await db.prepare(`UPDATE promo_codes SET is_active = ?1 WHERE id = ?2`).bind(parsed.data.isActive ? 1 : 0, id).run();

  return NextResponse.json({ data: { id, isActive: parsed.data.isActive } });
}
