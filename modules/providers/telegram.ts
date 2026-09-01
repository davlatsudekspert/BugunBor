export type TelegramSendResult = { ok: true; messageId?: number } | { ok: false; error: string };

async function callTelegramApi(botToken: string, method: string, payload: Record<string, unknown>): Promise<TelegramSendResult> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as { ok?: boolean; description?: string; result?: { message_id?: number } } | null;
    if (!response.ok || !body?.ok) return { ok: false, error: body?.description ?? `telegram_http_${response.status}` };
    return { ok: true, messageId: body.result?.message_id };
  } catch {
    return { ok: false, error: 'TELEGRAM_REQUEST_FAILED' };
  }
}

export interface TelegramOtpProvider {
  sendLoginCode(input: { chatId: string; code: string; expiresInMinutes: number; audience?: 'admin' | 'customer' }): Promise<TelegramSendResult>;
}

/**
 * Delivers login codes over Telegram instead of SMS — used both by the admin panel
 * (audience: 'admin', the default) and by the marketplace's phone+Telegram login
 * (audience: 'customer', see modules/auth/otp.ts). The bot can only message chats
 * that have already messaged it first (Bot API limitation): an admin's
 * `telegram_chat_id` is captured once via Team management, while a customer links
 * theirs by opening a one-time deep link to the bot (see the /telegram/bot/webhook
 * route) before their first code can be sent.
 *
 * Fails closed in production when no bot token is configured — it never pretends a
 * code was delivered. In local development it logs the code to the server console
 * instead, so both login flows stay testable without a real bot.
 */
export function createTelegramOtpProvider(botToken: string | undefined): TelegramOtpProvider {
  return {
    async sendLoginCode({ chatId, code, expiresInMinutes, audience = 'admin' }) {
      if (!botToken) {
        if (process.env.NODE_ENV === 'production') return { ok: false, error: 'TELEGRAM_BOT_TOKEN_MISSING' };
        // Local development never has a real bot to call, so the code goes to the
        // server console instead — logged regardless of chat id, so the login
        // flow stays testable before Telegram is wired up.
        console.info(`[dev] BugunBor ${audience} OTP for chat ${chatId || '(no telegram_chat_id set)'}: ${code} (${expiresInMinutes} daqiqa amal qiladi)`);
        return { ok: true };
      }

      if (!chatId) return { ok: false, error: 'NO_TELEGRAM_CHAT_ID' };

      const text = audience === 'admin'
        ? `BugunBor admin kirish kodi: ${code}\nKod ${expiresInMinutes} daqiqa amal qiladi. Agar bu siz bo‘lmasangiz, xabarni e’tiborsiz qoldiring.`
        : `BugunBor kirish kodi: ${code}\nKod ${expiresInMinutes} daqiqa amal qiladi. Agar bu siz bo‘lmasangiz, xabarni e’tiborsiz qoldiring.`;
      return callTelegramApi(botToken, 'sendMessage', { chat_id: chatId, text });
    },
  };
}

export interface TelegramChannelProvider {
  postAnnouncement(input: { channelId: string; text: string }): Promise<TelegramSendResult>;
}

/**
 * Posts marketing announcements (a new deal, a promo) to a Telegram channel
 * the bot administers. Same fail-closed-in-production / log-in-dev contract
 * as the OTP provider above — see modules/admin for the caller.
 */
export function createTelegramChannelProvider(botToken: string | undefined): TelegramChannelProvider {
  return {
    async postAnnouncement({ channelId, text }) {
      if (!botToken) {
        if (process.env.NODE_ENV === 'production') return { ok: false, error: 'TELEGRAM_BOT_TOKEN_MISSING' };
        console.info(`[dev] BugunBor channel announcement for ${channelId || '(no channel configured)'}:\n${text}`);
        return { ok: true };
      }

      if (!channelId) return { ok: false, error: 'NO_TELEGRAM_CHANNEL_ID' };

      return callTelegramApi(botToken, 'sendMessage', { chat_id: channelId, text, disable_web_page_preview: false });
    },
  };
}
