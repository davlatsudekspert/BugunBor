import { ensurePhase1Database, getD1 } from '@/db/runtime';
import { randomToken, sha256Hex } from '@/lib/crypto';

import type { TelegramWebAppUser } from './webapp';

export const TELEGRAM_SESSION_COOKIE = 'bb_tg_session';
const SESSION_TTL_DAYS = 30;

/**
 * Mints a marketplace session for a Telegram Mini App visitor already verified by
 * verifyTelegramInitData(). Mirrors modules/admin/auth.ts's session pattern: only the token's
 * SHA-256 hash is ever stored, the plaintext is returned once for the caller to set as a
 * cookie. The Telegram user is mirrored into `users` (id `tg_<telegramUserId>`) so every
 * existing customer API (favorites, claims, reviews…) works for a Mini App visitor with zero
 * changes — they're just another `RequestIdentity`.
 */
export async function issueTelegramSession(user: TelegramWebAppUser): Promise<{ token: string; userId: string }> {
  await ensurePhase1Database();
  const db = getD1();
  const userId = `tg_${user.id}`;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Telegram foydalanuvchisi';

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db.batch([
    db
      .prepare(`INSERT INTO users(id, role, display_name) VALUES (?1, 'CUSTOMER', ?2)
        ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, updated_at = CURRENT_TIMESTAMP`)
      .bind(userId, displayName),
    db
      .prepare(`INSERT INTO telegram_sessions(id, user_id, telegram_user_id, token_hash, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)`)
      .bind(crypto.randomUUID(), userId, String(user.id), tokenHash, expiresAt),
  ]);

  return { token, userId };
}

export async function resolveTelegramSession(token: string | undefined): Promise<{ id: string; displayName: string } | null> {
  if (!token) return null;
  await ensurePhase1Database();
  const tokenHash = await sha256Hex(token);
  const row = await getD1()
    .prepare(`
      SELECT u.id, u.display_name AS displayName FROM telegram_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND s.revoked_at IS NULL AND datetime(s.expires_at) > datetime('now')
    `)
    .bind(tokenHash)
    .first<{ id: string; displayName: string }>();
  return row ?? null;
}
