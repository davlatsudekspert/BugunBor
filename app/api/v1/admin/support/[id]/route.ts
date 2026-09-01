import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  resolutionNote: z.string().trim().max(800).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  if (!admin || !canAdmin(admin.role, 'admin.support.manage')) {
    return NextResponse.json({ error: { message: 'Ruxsat yo‘q.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Holatni to‘g‘ri tanlang.' } }, { status: 422 });

  await ensurePhase1Database();
  const db = getD1();
  const { id } = await context.params;
  const ticket = await db.prepare('SELECT id FROM support_tickets WHERE id = ?1').bind(id).first<{ id: string }>();
  if (!ticket) return NextResponse.json({ error: { message: 'Murojaat topilmadi.' } }, { status: 404 });

  await db
    .prepare(`UPDATE support_tickets SET status = ?1, resolution_note = COALESCE(?2, resolution_note), resolved_by_admin_id = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4`)
    .bind(parsed.data.status, parsed.data.resolutionNote ?? null, admin.id, id)
    .run();

  return NextResponse.json({ data: { id, status: parsed.data.status } });
}
