import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { getAdminSessionFromRequest } from '@/modules/admin/auth';
import { canAdmin } from '@/modules/admin/authorization';
import { requireSameOrigin } from '@/modules/auth/identity';
import { normalizeUzbekPhone } from '@/modules/auth/phone';

const bodySchema = z.object({
  phone: z.string().min(5).max(40),
  displayName: z.string().trim().min(2).max(80),
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']),
  telegramChatId: z.string().trim().min(1).max(40).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const admin = await getAdminSessionFromRequest(request);
  if (!admin || !canAdmin(admin.role, 'admin.team.manage')) {
    return NextResponse.json({ error: { message: 'Jamoani boshqarish uchun Bosh admin huquqi kerak.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Telefon, ism va lavozimni to‘g‘ri kiriting.' } }, { status: 422 });

  let phone: string;
  try {
    phone = normalizeUzbekPhone(parsed.data.phone);
  } catch {
    return NextResponse.json({ error: { message: 'Telefon raqami +998XXXXXXXXX ko‘rinishida bo‘lishi kerak.' } }, { status: 422 });
  }

  await ensurePhase1Database();
  const db = getD1();
  const existing = await db.prepare('SELECT id FROM admin_users WHERE phone = ?1').bind(phone).first<{ id: string }>();
  if (existing) return NextResponse.json({ error: { message: 'Bu raqam bilan admin allaqachon mavjud.' } }, { status: 409 });

  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO admin_users(id, phone, display_name, role, status, telegram_chat_id, created_by_id)
      VALUES (?1, ?2, ?3, ?4, 'ACTIVE', ?5, ?6)`)
    .bind(id, phone, parsed.data.displayName, parsed.data.role, parsed.data.telegramChatId ?? null, admin.id)
    .run();

  return NextResponse.json({ data: { id, phone, role: parsed.data.role } }, { status: 201 });
}
