import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { randomDigits, randomToken, sha256Hex, timingSafeEqual } from '@/lib/crypto';
import { extractLinkToken } from '@/modules/auth/link-token';
import { createTelegramOtpProvider } from '@/modules/providers/telegram';

export { extractLinkToken };

export type MarketplaceRole = 'CUSTOMER' | 'BUSINESS_OWNER' | 'BUSINESS_STAFF' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
export type MarketplaceIdentity = { id: string; phone: string; displayName: string; role: MarketplaceRole };

export const SESSION_COOKIE = '__Host-bugunbor_session';
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_WINDOW = 3;
const SESSION_TTL_DAYS = 30;
const LINK_TOKEN_TTL_MINUTES = 15;

type UserRow = { id: string; phone: string; displayName: string; role: MarketplaceRole; status: string; telegramChatId: string | null };

async function findOrCreateUserByPhone(db: D1Database, phone: string): Promise<UserRow> {
  const existing = await db
    .prepare(`SELECT id, phone, display_name AS displayName, role, status, telegram_chat_id AS telegramChatId FROM users WHERE phone = ?1`)
    .bind(phone)
    .first<UserRow>();
  if (existing) return existing;
  // First time this phone has ever tried to log in — same auto-provision-on-first-contact
  // pattern modules/auth/identity.ts already uses for a platform-authenticated visitor.
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO users(id, role, phone, display_name) VALUES (?1, 'CUSTOMER', ?2, ?3)`).bind(id, phone, phone).run();
  return { id, phone, displayName: phone, role: 'CUSTOMER', status: 'ACTIVE', telegramChatId: null };
}

export type RequestLoginCodeResult =
  | { status: 'SENT' }
  | { status: 'NEEDS_TELEGRAM_LINK'; telegramDeepLink: string }
  | { status: 'RATE_LIMITED' };

/**
 * A first-time phone has no Telegram chat linked yet — the bot can't message anyone who
 * hasn't messaged it first (Bot API limitation), so this hands back a deep link
 * (`https://t.me/<bot>?start=link_<token>`) instead of a code. Opening it and pressing
 * Start delivers `/start link_<token>` to POST /api/v1/telegram/bot/webhook, which pairs
 * that chat id with this phone (see linkPhoneToTelegramChat below); calling this function
 * again afterward finds the link and actually sends a code.
 */
export async function requestLoginCode(phone: string): Promise<RequestLoginCodeResult> {
  await ensurePhase1Database();
  const db = getD1();
  const user = await findOrCreateUserByPhone(db, phone);
  if (user.status !== 'ACTIVE') return { status: 'RATE_LIMITED' };

  if (!user.telegramChatId) {
    const token = randomToken(24);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
    await db.prepare(`INSERT INTO phone_link_tokens(token_hash, phone, expires_at) VALUES (?1, ?2, ?3)`).bind(tokenHash, phone, expiresAt).run();
    const botUsername = env.TELEGRAM_BOT_USERNAME || 'bugunborbot';
    return { status: 'NEEDS_TELEGRAM_LINK', telegramDeepLink: `https://t.me/${botUsername}?start=link_${token}` };
  }

  const recent = await db
    .prepare(`SELECT COUNT(*) AS count FROM user_otp_codes WHERE user_id = ?1 AND datetime(created_at) > datetime('now', '-10 minutes')`)
    .bind(user.id)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= OTP_MAX_PER_WINDOW) return { status: 'RATE_LIMITED' };

  const code = randomDigits(6);
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
  await db
    .prepare(`INSERT INTO user_otp_codes(id, user_id, code_hash, expires_at) VALUES (?1, ?2, ?3, ?4)`)
    .bind(crypto.randomUUID(), user.id, codeHash, expiresAt)
    .run();

  const telegram = createTelegramOtpProvider(env.TELEGRAM_BOT_TOKEN);
  await telegram.sendLoginCode({ chatId: user.telegramChatId, code, expiresInMinutes: OTP_TTL_MINUTES, audience: 'customer' });
  return { status: 'SENT' };
}

export type VerifyLoginCodeResult =
  | { ok: true; token: string; user: MarketplaceIdentity }
  | { ok: false; reason: 'INVALID' | 'RATE_LIMITED' };

export async function verifyLoginCode(
  phone: string,
  code: string,
  meta: { userAgent: string | null; ipHash: string | null },
): Promise<VerifyLoginCodeResult> {
  await ensurePhase1Database();
  const db = getD1();
  const user = await db
    .prepare(`SELECT id, phone, display_name AS displayName, role, status FROM users WHERE phone = ?1`)
    .bind(phone)
    .first<{ id: string; phone: string; displayName: string; role: MarketplaceRole; status: string }>();
  if (!user || user.status !== 'ACTIVE') return { ok: false, reason: 'INVALID' };

  const otp = await db
    .prepare(`SELECT id, code_hash AS codeHash, expires_at AS expiresAt, attempts FROM user_otp_codes WHERE user_id = ?1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(user.id)
    .first<{ id: string; codeHash: string; expiresAt: string; attempts: number }>();
  if (!otp) return { ok: false, reason: 'INVALID' };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'RATE_LIMITED' };
  if (new Date(`${otp.expiresAt}Z`) <= new Date()) return { ok: false, reason: 'INVALID' };

  const codeHash = await sha256Hex(code);
  if (!timingSafeEqual(codeHash, otp.codeHash)) {
    await db.prepare(`UPDATE user_otp_codes SET attempts = attempts + 1 WHERE id = ?1`).bind(otp.id).run();
    return { ok: false, reason: 'INVALID' };
  }

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.batch([
    db.prepare(`UPDATE user_otp_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?1`).bind(otp.id),
    db
      .prepare(`INSERT INTO sessions(id, user_id, token_hash, expires_at, user_agent, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
      .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt, meta.userAgent, meta.ipHash),
  ]);

  return { ok: true, token, user: { id: user.id, phone: user.phone, displayName: user.displayName, role: user.role } };
}

export async function revokeSessionToken(token: string) {
  await ensurePhase1Database();
  const tokenHash = await sha256Hex(token);
  await getD1().prepare(`UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?1`).bind(tokenHash).run();
}

/** Exported for modules/auth/identity.ts's generic fallback chain — see resolveIdentity there. */
export async function resolveSessionToken(token: string | undefined): Promise<MarketplaceIdentity | null> {
  if (!token) return null;
  await ensurePhase1Database();
  const tokenHash = await sha256Hex(token);
  const row = await getD1()
    .prepare(`
      SELECT u.id, u.phone, u.display_name AS displayName, u.role, u.status
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND s.revoked_at IS NULL AND datetime(s.expires_at) > datetime('now')
    `)
    .bind(tokenHash)
    .first<{ id: string; phone: string; displayName: string; role: MarketplaceRole; status: string }>();
  if (!row || row.status !== 'ACTIVE') return null;
  return { id: row.id, phone: row.phone, displayName: row.displayName, role: row.role };
}

function readCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    if (part.slice(0, separatorIndex).trim() === name) return decodeURIComponent(part.slice(separatorIndex + 1).trim());
  }
  return undefined;
}

/** For API route handlers, which receive the raw `Request` and its `Cookie` header. */
export async function getSessionFromRequest(request: Request): Promise<MarketplaceIdentity | null> {
  return resolveSessionToken(readCookieValue(request.headers.get('cookie'), SESSION_COOKIE));
}

/** For Server Component pages, which read the request via `next/headers` instead. */
export async function getSessionFromCookies(): Promise<MarketplaceIdentity | null> {
  const store = await cookies();
  return resolveSessionToken(store.get(SESSION_COOKIE)?.value);
}


export type LinkPhoneResult = { ok: true; phone: string } | { ok: false; reason: 'INVALID_TOKEN' | 'CHAT_ALREADY_LINKED' };

/**
 * Pairs a Telegram chat id with the phone number that generated `token` (see
 * requestLoginCode above). Called from the bot webhook once it sees `/start link_<token>`.
 */
export async function linkPhoneToTelegramChat(token: string, chatId: string): Promise<LinkPhoneResult> {
  await ensurePhase1Database();
  const db = getD1();
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(`SELECT phone, expires_at AS expiresAt, consumed_at AS consumedAt FROM phone_link_tokens WHERE token_hash = ?1`)
    .bind(tokenHash)
    .first<{ phone: string; expiresAt: string; consumedAt: string | null }>();
  if (!row || row.consumedAt || new Date(`${row.expiresAt}Z`) <= new Date()) return { ok: false, reason: 'INVALID_TOKEN' };

  try {
    await db.batch([
      db.prepare(`UPDATE phone_link_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE token_hash = ?1`).bind(tokenHash),
      db.prepare(`UPDATE users SET telegram_chat_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE phone = ?2`).bind(chatId, row.phone),
    ]);
  } catch (error) {
    // The partial UNIQUE index on telegram_chat_id rejects linking one Telegram account to
    // a second phone number — treat that as a normal, expected outcome, not a crash.
    if (error instanceof Error && /unique/i.test(error.message)) return { ok: false, reason: 'CHAT_ALREADY_LINKED' };
    throw error;
  }
  return { ok: true, phone: row.phone };
}
