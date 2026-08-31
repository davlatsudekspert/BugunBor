import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sha256Hex } from '@/lib/crypto';
import { ADMIN_SESSION_COOKIE, verifyAdminLoginCode } from '@/modules/admin/auth';
import { requireSameOrigin } from '@/modules/auth/identity';
import { normalizeUzbekPhone } from '@/modules/auth/phone';

const bodySchema = z.object({ phone: z.string().min(5).max(40), code: z.string().regex(/^\d{6}$/) });
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'Telefon raqami va 6 xonali kodni kiriting.' } }, { status: 422 });

  let phone: string;
  try {
    phone = normalizeUzbekPhone(parsed.data.phone);
  } catch {
    return NextResponse.json({ error: { message: 'Kod noto‘g‘ri yoki eskirgan.' } }, { status: 401 });
  }

  const ip = request.headers.get('cf-connecting-ip');
  const result = await verifyAdminLoginCode(phone, parsed.data.code, {
    userAgent: request.headers.get('user-agent'),
    ipHash: ip ? await sha256Hex(ip) : null,
  });

  if (!result.ok) {
    const status = result.reason === 'RATE_LIMITED' ? 429 : 401;
    const message = result.reason === 'RATE_LIMITED' ? 'Juda ko‘p noto‘g‘ri urinish. Yangi kod so‘rang.' : 'Kod noto‘g‘ri yoki eskirgan.';
    return NextResponse.json({ error: { message } }, { status });
  }

  const response = NextResponse.json({ data: { displayName: result.admin.displayName, role: result.admin.role } });
  response.cookies.set(ADMIN_SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
