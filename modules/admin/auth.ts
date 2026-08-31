import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';

import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { randomDigits, randomToken, sha256Hex, timingSafeEqual } from '@/lib/crypto';
import { createTelegramOtpProvider } from '@/modules/providers/telegram';

import type { AdminRole } from './authorization';

export type AdminIdentity = { id: string; phone: string; displayName: string; role: AdminRole };

export const ADMIN_SESSION_COOKIE = 'bb_admin_session';
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_WINDOW = 3;
const SESSION_TTL_HOURS = 12;

type AdminUserRow = { id: string; phone: string; displayName: string; role: AdminRole; status: 'ACTIVE' | 'SUSPENDED'; telegramChatId: string | null };

async function findActiveAdminByPhone(phone: string) {
  await ensurePhase1Database();
  return getD1()
    .prepare(`SELECT id, phone, display_name AS displayName, role, status, telegram_chat_id AS telegramChatId FROM admin_users WHERE phone = ?1`)
    .bind(phone)
    .first<AdminUserRow>();
}

export type RequestLoginCodeResult = 'SENT' | 'RATE_LIMITED';

/**
 * Always resolves to 'SENT' for a phone that isn't a registered admin — the
 * caller must never learn from this response whether a given phone number
 * has admin access. Only an existing account's own rate limit is surfaced.
 */
export async function requestAdminLoginCode(phone: string): Promise<RequestLoginCodeResult> {
  const admin = await findActiveAdminByPhone(phone);
  if (!admin || admin.status !== 'ACTIVE') return 'SENT';

  const db = getD1();
  const recent = await db
    .prepare(`SELECT COUNT(*) AS count FROM admin_otp_codes WHERE admin_user_id = ?1 AND datetime(created_at) > datetime('now', '-10 minutes')`)
    .bind(admin.id)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= OTP_MAX_PER_WINDOW) return 'RATE_LIMITED';

  const code = randomDigits(6);
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
  await db
    .prepare(`INSERT INTO admin_otp_codes(id, admin_user_id, code_hash, expires_at) VALUES (?1, ?2, ?3, ?4)`)
    .bind(crypto.randomUUID(), admin.id, codeHash, expiresAt)
    .run();

  const telegram = createTelegramOtpProvider(env.TELEGRAM_BOT_TOKEN);
  // Delivery failures (no bot token / chat id / network) are intentionally swallowed here:
  // surfacing them to the caller would confirm this phone number is a registered admin.
  await telegram.sendLoginCode({ chatId: admin.telegramChatId ?? '', code, expiresInMinutes: OTP_TTL_MINUTES });
  return 'SENT';
}

export type VerifyLoginCodeResult =
  | { ok: true; token: string; admin: AdminIdentity }
  | { ok: false; reason: 'INVALID' | 'RATE_LIMITED' };

export async function verifyAdminLoginCode(
  phone: string,
  code: string,
  meta: { userAgent: string | null; ipHash: string | null },
): Promise<VerifyLoginCodeResult> {
  const admin = await findActiveAdminByPhone(phone);
  if (!admin || admin.status !== 'ACTIVE') return { ok: false, reason: 'INVALID' };

  const db = getD1();
  const otp = await db
    .prepare(`SELECT id, code_hash AS codeHash, expires_at AS expiresAt, attempts FROM admin_otp_codes WHERE admin_user_id = ?1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(admin.id)
    .first<{ id: string; codeHash: string; expiresAt: string; attempts: number }>();
  if (!otp) return { ok: false, reason: 'INVALID' };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'RATE_LIMITED' };
  if (new Date(`${otp.expiresAt}Z`) <= new Date()) return { ok: false, reason: 'INVALID' };

  const codeHash = await sha256Hex(code);
  if (!timingSafeEqual(codeHash, otp.codeHash)) {
    await db.prepare(`UPDATE admin_otp_codes SET attempts = attempts + 1 WHERE id = ?1`).bind(otp.id).run();
    return { ok: false, reason: 'INVALID' };
  }

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await db.batch([
    db.prepare(`UPDATE admin_otp_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?1`).bind(otp.id),
    db
      .prepare(`INSERT INTO admin_sessions(id, admin_user_id, token_hash, expires_at, user_agent, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
      .bind(crypto.randomUUID(), admin.id, tokenHash, expiresAt, meta.userAgent, meta.ipHash),
  ]);

  return { ok: true, token, admin: { id: admin.id, phone: admin.phone, displayName: admin.displayName, role: admin.role } };
}

export async function revokeAdminSessionToken(token: string) {
  await ensurePhase1Database();
  const tokenHash = await sha256Hex(token);
  await getD1().prepare(`UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?1`).bind(tokenHash).run();
}

async function resolveAdminSessionToken(token: string | undefined): Promise<AdminIdentity | null> {
  if (!token) return null;
  await ensurePhase1Database();
  const tokenHash = await sha256Hex(token);
  const row = await getD1()
    .prepare(`
      SELECT au.id, au.phone, au.display_name AS displayName, au.role, au.status
      FROM admin_sessions s JOIN admin_users au ON au.id = s.admin_user_id
      WHERE s.token_hash = ?1 AND s.revoked_at IS NULL AND datetime(s.expires_at) > datetime('now')
    `)
    .bind(tokenHash)
    .first<{ id: string; phone: string; displayName: string; role: AdminRole; status: 'ACTIVE' | 'SUSPENDED' }>();
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
export async function getAdminSessionFromRequest(request: Request): Promise<AdminIdentity | null> {
  return resolveAdminSessionToken(readCookieValue(request.headers.get('cookie'), ADMIN_SESSION_COOKIE));
}

/** For Server Component pages, which read the request via `next/headers` instead. */
export async function getAdminSessionFromCookies(): Promise<AdminIdentity | null> {
  const store = await cookies();
  return resolveAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
}
