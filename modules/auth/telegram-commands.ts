/**
 * Pure parsing for the Telegram bot webhook's incoming updates — kept dependency-free (no
 * cloudflare:workers, no D1) so it's testable without the Workers runtime. See
 * modules/auth/otp.ts (requestLoginCode / linkPhoneFromContact) for the rest of the flow.
 */

/** Matches "/start", "/start@BotUsername", or either with a payload — anything that should
 * make the bot offer its "share phone number" button. */
export function isStartCommand(text: string | undefined | null): boolean {
  if (!text) return false;
  return /^\/start(@\S+)?(\s|$)/.test(text.trim());
}
