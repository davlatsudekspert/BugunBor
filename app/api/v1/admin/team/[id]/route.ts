import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';

const bodySchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  telegramChatId: z.string().trim().max(40).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  if (!admin || !canAdmin(admin.role, 'admin.team.manage')) {
    return NextResponse.json({ error: { message: 'Jamoani boshqarish uchun Bosh admin huquqi kerak.' } }, { status: 403 });
  }

  const { id } = await context.params;
  if (id === admin.id) return NextResponse.json({ error: { message: 'O‘z hisobingizni bu yerdan o‘zgartira olmaysiz — boshqa Bosh admin so‘rasin.' } }, { status: 409 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.role && !parsed.data.status && parsed.data.telegramChatId === undefined)) {
    return NextResponse.json({ error: { message: 'O‘zgartiriladigan maydonni ko‘rsating.' } }, { status: 422 });
  }

  await ensurePhase1Database();
  const db = getD1();
  const target = await db.prepare('SELECT id, role, status FROM admin_users WHERE id = ?1').bind(id).first<{ id: string; role: string; status: string }>();
  if (!target) return NextResponse.json({ error: { message: 'Admin topilmadi.' } }, { status: 404 });

  const demotingOrSuspendingLastSuperAdmin =
    target.role === 'SUPER_ADMIN' &&
    ((parsed.data.role && parsed.data.role !== 'SUPER_ADMIN') || parsed.data.status === 'SUSPENDED');
  if (demotingOrSuspendingLastSuperAdmin) {
    const remaining = await db
      .prepare(`SELECT COUNT(*) AS count FROM admin_users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id != ?1`)
      .bind(id)
      .first<{ count: number }>();
    if ((remaining?.count ?? 0) === 0) {
      return NextResponse.json({ error: { message: 'Kamida bitta faol Bosh admin qolishi shart.' } }, { status: 409 });
    }
  }

  const role = parsed.data.role ?? target.role;
  const status = parsed.data.status ?? target.status;
  const telegramChatId = parsed.data.telegramChatId;
  await db
    .prepare(`UPDATE admin_users SET role = ?1, status = ?2, telegram_chat_id = COALESCE(?3, telegram_chat_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?4`)
    .bind(role, status, telegramChatId ?? null, id)
    .run();

  return NextResponse.json({ data: { id, role, status } });
}
