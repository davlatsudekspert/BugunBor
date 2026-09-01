import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requestLoginCode } from '@/modules/auth/otp';
import { requireSameOrigin } from '@/modules/auth/identity';
import { normalizeUzbekPhone } from '@/modules/auth/phone';

const bodySchema = z.object({ phone: z.string().min(5).max(40) });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Telefon raqamini kiriting.' } }, { status: 422 });

  let phone: string;
  try {
    phone = normalizeUzbekPhone(parsed.data.phone);
  } catch {
    return NextResponse.json({ error: { message: 'Telefon raqami +998XXXXXXXXX ko‘rinishida bo‘lishi kerak.' } }, { status: 422 });
  }

  const result = await requestLoginCode(phone);
  if (result.status === 'RATE_LIMITED') {
    return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Juda ko‘p urinish. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.' } }, { status: 429 });
  }
  if (result.status === 'NEEDS_TELEGRAM_LINK') {
    return NextResponse.json({ data: { status: 'NEEDS_TELEGRAM_LINK', telegramDeepLink: result.telegramDeepLink } });
  }
  return NextResponse.json({ data: { status: 'SENT' } });
}
