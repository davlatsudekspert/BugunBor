import { serializeCookie } from '@/lib/cookies';
import { randomToken, sha256Hex } from '@/lib/crypto';
import { addMinutes, parseDbTime, toDbTime } from '@/lib/time';
import type { PlatformRole, UserStatus } from './users';

export const SESSION_COOKIE = 'bb_session';
export const SESSION_DAYS = 30;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  sessionId: string;
  role: PlatformRole;
  displayName: string;
  phone: string | null;
  locale: string;
  status: UserStatus;
};

export async function createSession(db: D1Database, userId: string, meta: { userAgent?: string | null; ipHash?: string | null }, now = new Date()) {
  const token = randomToken(32);
  const id = crypto.randomUUID();
  const expiresAt = addMinutes(now, SESSION_DAYS * 24 * 60);
  const nowDb = toDbTime(now);
  await db
    .prepare(`INSERT INTO sessions(id, user_id, token_hash, created_at, expires_at, last_seen_at, user_agent, ip_hash)
      VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?6, ?7)`)
    .bind(id, userId, await sha256Hex(token), nowDb, toDbTime(expiresAt), meta.userAgent?.slice(0, 300) ?? null, meta.ipHash ?? null)
    .run();
  return { id, token, expiresAt };
}

export async function getSessionUser(db: D1Database, token: string | null | undefined, now = new Date()): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const row = await db
    .prepare(`SELECT s.id AS sessionId, s.last_seen_at AS lastSeenAt, u.id, u.role, u.display_name AS displayName, u.phone, u.locale, u.status
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND s.revoked_at IS NULL AND s.expires_at > ?2`)
    .bind(await sha256Hex(token), toDbTime(now))
    .first<SessionUser & { lastSeenAt: string }>();
  if (!row || row.status !== 'ACTIVE') return null;
  if (now.getTime() - parseDbTime(row.lastSeenAt).getTime() > TOUCH_INTERVAL_MS) {
    await db.prepare(`UPDATE sessions SET last_seen_at = ?2 WHERE id = ?1`).bind(row.sessionId, toDbTime(now)).run();
  }
  const { lastSeenAt: _lastSeenAt, ...user } = row;
  return user;
}

export async function revokeSessionByToken(db: D1Database, token: string, now = new Date()) {
  await db
    .prepare(`UPDATE sessions SET revoked_at = ?2 WHERE token_hash = ?1 AND revoked_at IS NULL`)
    .bind(await sha256Hex(token), toDbTime(now))
    .run();
}

export function revokeAllSessionsStatement(db: D1Database, userId: string, nowDb: string) {
  return db.prepare(`UPDATE sessions SET revoked_at = ?2 WHERE user_id = ?1 AND revoked_at IS NULL`).bind(userId, nowDb);
}

export function sessionCookie(token: string, secure: boolean) {
  return serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 24 * 60 * 60, secure });
}

export function clearSessionCookie(secure: boolean) {
  return serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure });
}
