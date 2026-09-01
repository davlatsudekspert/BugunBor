import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

import { timingSafeEqual } from '@/lib/crypto';
import { linkPhoneFromContact } from '@/modules/auth/otp';
import { isStartCommand } from '@/modules/auth/telegram-commands';

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    contact?: { phone_number?: string; user_id?: number };
    from?: { id?: number };
  };
};

async function sendMessage(chatId: number | string, body: Record<string, unknown>) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.info('[dev] Telegram webhook sendMessage:', chatId, body);
    return;
  }
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, ...body }),
  }).catch(() => {});
}

/**
 * Telegram calls this whenever anyone messages the bot (after `setWebhook` is configured —
 * see the deploy workflow). Two things matter here:
 *
 *  - `/start` (bare, with a payload, or `@BotUsername`-suffixed) → offer the native "share
 *    phone number" button. No deep-link payload is needed or read anymore: a
 *    `request_contact` reply-keyboard button always reports the tapping user's own number,
 *    so it works identically whether this is their first-ever chat with the bot or their
 *    hundredth — unlike a deep link's `?start=` payload, which Telegram only auto-fills once.
 *  - a `contact` message (sent when that button is tapped) → pair the shared phone number
 *    with this Telegram chat via linkPhoneFromContact() (modules/auth/otp.ts).
 *
 * Everything else is ignored.
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

  if (chatId !== undefined && isStartCommand(update?.message?.text)) {
    await sendMessage(chatId, {
      text: 'Kirish kodini yuborishimiz uchun telefon raqamingizni ulashing 👇',
      reply_markup: {
        keyboard: [[{ text: '📱 Telefon raqamimni ulashish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  const contactPhone = update?.message?.contact?.phone_number;
  if (chatId !== undefined && contactPhone) {
    const result = await linkPhoneFromContact(contactPhone, String(chatId));
    const text = result.ok
      ? '✅ Raqamingiz bog‘landi! Endi saytga qaytib, kirish kodini so‘rang.'
      : result.reason === 'CHAT_ALREADY_LINKED'
        ? 'Bu Telegram hisobi allaqachon boshqa raqamga bog‘langan.'
        : 'Raqamni tanib bo‘lmadi. Saytga qaytib, qaytadan urinib ko‘ring.';
    await sendMessage(chatId, { text, reply_markup: { remove_keyboard: true } });
  }

  // Always 200 — Telegram retries indefinitely on anything else, and there is nothing useful
  // to retry here (an unmatched message is simply not ours to act on).
  return NextResponse.json({ ok: true });
}
