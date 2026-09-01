import { bytesToHex, hmacSha256, timingSafeEqual } from '@/lib/crypto';

export type TelegramWebAppUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
};

export type VerifyInitDataResult =
  | { ok: true; user: TelegramWebAppUser; authDate: number }
  | { ok: false; reason: 'NO_HASH' | 'NO_AUTH_DATE' | 'EXPIRED' | 'INVALID_HASH' | 'NO_USER' | 'MALFORMED' };

/**
 * Validates the `initData` string a Telegram Mini App hands the backend, per Telegram's documented
 * algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *   secret_key    = HMAC_SHA256(key = "WebAppData", message = bot_token)
 *   computed_hash = HEX(HMAC_SHA256(key = secret_key, message = data_check_string))
 *
 * where data_check_string is every initData field except `hash`, sorted by key, joined as
 * "key=value" lines with "\n". A mismatch means the payload wasn't actually signed by this bot's
 * token — e.g. a forged or tampered `user` field — and must never be trusted. `auth_date` is also
 * checked for freshness so an old leaked initData string can't be replayed indefinitely.
 */
export async function verifyTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 86400): Promise<VerifyInitDataResult> {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }

  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'NO_HASH' };
  params.delete('hash');

  const authDateRaw = params.get('auth_date');
  if (!authDateRaw) return { ok: false, reason: 'NO_AUTH_DATE' };
  const authDate = Number(authDateRaw);
  const ageSeconds = Date.now() / 1000 - authDate;
  if (!Number.isFinite(authDate) || ageSeconds < 0 || ageSeconds > maxAgeSeconds) return { ok: false, reason: 'EXPIRED' };

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = await hmacSha256(new TextEncoder().encode('WebAppData'), botToken);
  const computedHash = bytesToHex(await hmacSha256(secretKey, dataCheckString));
  if (!timingSafeEqual(computedHash, hash)) return { ok: false, reason: 'INVALID_HASH' };

  const userJson = params.get('user');
  if (!userJson) return { ok: false, reason: 'NO_USER' };
  try {
    const raw = JSON.parse(userJson) as { id: number; first_name: string; last_name?: string; username?: string; language_code?: string };
    if (typeof raw.id !== 'number' || typeof raw.first_name !== 'string') return { ok: false, reason: 'NO_USER' };
    return {
      ok: true,
      authDate,
      user: { id: raw.id, firstName: raw.first_name, lastName: raw.last_name, username: raw.username, languageCode: raw.language_code },
    };
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
}
