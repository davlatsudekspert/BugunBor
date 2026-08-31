import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1, mirrorAdminAsPlatformUser } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  priceUzs: z.coerce.number().int().min(0).max(50_000_000),
  description: z.string().trim().max(400).optional().default(''),
  features: z.array(z.string().trim().min(1).max(120)).max(12).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  if (!admin || !canAdmin(admin.role, 'admin.plans.manage')) {
    return NextResponse.json({ error: { message: 'Narxlash ustidan ruxsat talab qilinadi.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Reja ma’lumotlarini tekshiring.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const { id } = await context.params;
  const plan = await db.prepare('SELECT id FROM plans WHERE id = ?1').bind(id).first<{ id: string }>();
  if (!plan) return NextResponse.json({ error: { message: 'Reja topilmadi.' } }, { status: 404 });

  await mirrorAdminAsPlatformUser(db, { id: admin.id, displayName: admin.displayName, role: admin.role });
  await db
    .prepare(`UPDATE plans SET name = ?1, price_uzs = ?2, description = ?3, features_json = ?4, is_active = ?5, updated_by_id = ?6, updated_at = CURRENT_TIMESTAMP WHERE id = ?7`)
    .bind(parsed.data.name, parsed.data.priceUzs, parsed.data.description, JSON.stringify(parsed.data.features), parsed.data.isActive ? 1 : 0, admin.id, id)
    .run();

  return NextResponse.json({ data: { id } });
}
