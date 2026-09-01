import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSameOrigin } from '@/modules/auth/identity';
import { issueTelegramSession, TELEGRAM_SESSION_COOKIE } from '@/modules/telegram/session';
import { verifyTelegramInitData } from '@/modules/telegram/webapp';

const bodySchema = z.object({ initData: z.string().min(1).max(4096) });
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * The Telegram Mini App entry page (/telegram) posts `Telegram.WebApp.initData` here on load.
 * Never trust that string without verifying it was actually signed by this bot's own token —
 * see modules/telegram/webapp.ts for the HMAC check itself.
 */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return NextResponse.json({ error: { message: 'So‘rov manbasi tasdiqlanmadi.' } }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { message: 'initData yuborilmadi.' } }, { status: 422 });

  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: { message: 'Telegram bot sozlanmagan.' } }, { status: 503 });

  const result = await verifyTelegramInitData(parsed.data.initData, botToken);
  if (!result.ok) return NextResponse.json({ error: { code: result.reason, message: 'Telegram orqali tasdiqlash muvaffaqiyatsiz.' } }, { status: 401 });

  const { token } = await issueTelegramSession(result.user);

  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(TELEGRAM_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
