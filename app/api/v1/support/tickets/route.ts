import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { requireSameOrigin } from '@/modules/auth/identity';
import { normalizeUzbekPhone } from '@/modules/auth/phone';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().min(5).max(40),
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(5).max(2000),
  source: z.enum(['CONTACT_FORM', 'AI_ASSISTANT']).optional().default('CONTACT_FORM'),
});

/** Every "Bog'lanish" submission and AI Yordamchi lead lands here — visible to admins at /admin/support. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Ism, telefon, mavzu va xabarni to‘g‘ri kiriting.' } }, { status: 422 });

  let phone: string;
  try {
    phone = normalizeUzbekPhone(parsed.data.phone);
  } catch {
    return NextResponse.json({ error: { message: 'Telefon raqami +998XXXXXXXXX ko‘rinishida bo‘lishi kerak.' } }, { status: 422 });
  }

  await ensurePhase1Database();
  const id = crypto.randomUUID();
  await getD1()
    .prepare(`INSERT INTO support_tickets(id, name, phone, subject, message, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(id, parsed.data.name, phone, parsed.data.subject, parsed.data.message, parsed.data.source)
    .run();

  return NextResponse.json({ data: { id } }, { status: 201 });
}
