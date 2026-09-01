/**
 * Pure parsing for the Telegram bot webhook's incoming `/start link_<token>` command — kept
 * dependency-free (no cloudflare:workers, no D1) so it's testable without the Workers runtime.
 * See modules/auth/otp.ts (requestLoginCode / linkPhoneToTelegramChat) for the rest of the flow.
 */
export function extractLinkToken(messageText: string | undefined | null): string | null {
  if (!messageText) return null;
  const match = /^\/start\s+link_([A-Za-z0-9_-]+)$/.exec(messageText.trim());
  return match ? match[1] : null;
}
