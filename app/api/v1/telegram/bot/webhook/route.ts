import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

import { timingSafeEqual } from '@/lib/crypto';
import { extractLinkToken, linkPhoneToTelegramChat } from '@/modules/auth/otp';

type TelegramUpdate = { message?: { text?: string; chat?: { id?: number | string } } };

/**
 * Telegram calls this whenever anyone messages the bot (after `setWebhook` is configured —
 * see the deploy workflow). The only thing this project's bot needs from ordinary chat
 * traffic is `/start link_<token>`, sent when a visitor opens the deep link
 * requestLoginCode() (modules/auth/otp.ts) handed them — everything else is ignored.
 *
 * `secret_token` (set via `setWebhook`'s own `secret_token` param, delivered back on every
 * call as this header) is the only thing standing between this endpoint and the open
 * internet, since Telegram's webhook calls aren't otherwise authenticated — never skip it.
 */
export async function POST(request: Request) {
  const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) return NextResponse.json({ error: { message: 'Webhook sozlanmagan.' } }, { status: 503 });

  const providedSecret = request.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!timingSafeEqual(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: { message: 'Ruxsat berilmadi.' } }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const chatId = update?.message?.chat?.id;
  const token = extractLinkToken(update?.message?.text);

  if (token && chatId !== undefined) {
    const result = await linkPhoneToTelegramChat(token, String(chatId));
    const text = result.ok
      ? '✅ Raqamingiz bog‘landi! Endi saytga qaytib, kirish kodini so‘rang.'
      : result.reason === 'CHAT_ALREADY_LINKED'
        ? 'Bu Telegram hisobi allaqachon boshqa raqamga bog‘langan.'
        : 'Havola muddati o‘tgan yoki noto‘g‘ri. Saytga qaytib, qaytadan urinib ko‘ring.';
    // createTelegramOtpProvider's sendLoginCode is shaped for an actual code, not a
    // free-form confirmation — call the API directly for this one instead.
    if (env.TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      }).catch(() => {});
    } else {
      console.info(`[dev] Telegram link webhook: ${text}`);
    }
  }

  // Always 200 — Telegram retries indefinitely on anything else, and there is nothing useful
  // to retry here (an unmatched message is simply not ours to act on).
  return NextResponse.json({ ok: true });
}
