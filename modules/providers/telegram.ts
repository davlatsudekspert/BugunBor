export type TelegramSendResult = { ok: true } | { ok: false; error: string };

export interface TelegramOtpProvider {
  sendLoginCode(input: { chatId: string; code: string; expiresInMinutes: number }): Promise<TelegramSendResult>;
}

/**
 * Delivers admin login codes over Telegram instead of SMS. The bot can only
 * message chats that have already messaged it first (Bot API limitation), so
 * each admin's `telegram_chat_id` must be captured once via Team management
 * (see docs in .env.example) before their first login.
 *
 * Fails closed in production when no bot token is configured — it never
 * pretends a code was delivered. In local development it logs the code to
 * the server console instead, so the login flow stays testable without a
 * real bot.
 */
export function createTelegramOtpProvider(botToken: string | undefined): TelegramOtpProvider {
  return {
    async sendLoginCode({ chatId, code, expiresInMinutes }) {
      if (!botToken) {
        if (process.env.NODE_ENV === 'production') return { ok: false, error: 'TELEGRAM_BOT_TOKEN_MISSING' };
        // Local development never has a real bot to call, so the code goes to the
        // server console instead — logged regardless of chat id, so the admin login
        // flow is fully testable before Telegram is wired up.
        console.info(`[dev] BugunBor admin OTP for chat ${chatId || '(no telegram_chat_id set)'}: ${code} (${expiresInMinutes} daqiqa amal qiladi)`);
        return { ok: true };
      }

      if (!chatId) return { ok: false, error: 'NO_TELEGRAM_CHAT_ID' };

      const text = `BugunBor admin kirish kodi: ${code}\nKod ${expiresInMinutes} daqiqa amal qiladi. Agar bu siz bo‘lmasangiz, xabarni e’tiborsiz qoldiring.`;
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        });
        const payload = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;
        if (!response.ok || !payload?.ok) return { ok: false, error: payload?.description ?? `telegram_http_${response.status}` };
        return { ok: true };
      } catch {
        return { ok: false, error: 'TELEGRAM_REQUEST_FAILED' };
      }
    },
  };
}
