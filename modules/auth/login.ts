import { randomToken, sha256Hex } from '@/lib/crypto';
import { safeReturnPath } from '@/lib/http';
import { LOGIN_REQUEST_MINUTES, PRIVACY_VERSION } from '@/lib/privacy';
import { addMinutes, toDbTime } from '@/lib/time';
import { DomainError } from '@/modules/errors';
import { getUserByTelegramId, upsertTelegramUser, type TelegramIdentity, type UserRecord } from './users';

// Telegram "device flow": the browser starts a request and shows a 4-digit
// match code; the user confirms the same code in the bot; the browser that
// started the request (proved by a secret cookie) then receives the session.
//
// Consent: a request can only be started after the person ticks "I agree to
// the privacy policy and terms" (the time and policy version are stored with
// the request), and approval copies that consent onto the account. No session
// is ever opened without a recorded consent.

export const LOGIN_COOKIE = 'bb_login';
export const LOGIN_TTL_MINUTES = LOGIN_REQUEST_MINUTES;

export type LoginStatus = 'PENDING' | 'WAITING' | 'APPROVED' | 'CONSUMED' | 'EXPIRED' | 'DENIED';

export type LoginRequestRow = {
  id: string;
  status: LoginStatus;
  matchCode: string;
  returnTo: string | null;
  locale: string;
  userAgent: string | null;
  telegramUserId: string | null;
  telegramChatId: string | null;
  userId: string | null;
  expiresAt: string;
  browserHash: string;
  consentAt: string | null;
  consentVersion: string | null;
  /** 'app' when the mobile app started the request (it polls with the secret, not a cookie). */
  client: string | null;
};

const COLUMNS = `id, status, match_code AS matchCode, return_to AS returnTo, locale, user_agent AS userAgent,
  telegram_user_id AS telegramUserId, telegram_chat_id AS telegramChatId, user_id AS userId,
  expires_at AS expiresAt, browser_hash AS browserHash, consent_at AS consentAt, consent_version AS consentVersion, client`;

function randomMatchCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 9000;
  return String(1000 + value);
}

function isOpen(row: LoginRequestRow, now: Date) {
  return row.expiresAt > toDbTime(now) && (row.status === 'PENDING' || row.status === 'WAITING');
}

export async function startLogin(
  db: D1Database,
  input: { returnTo?: string | null; locale: 'uz' | 'ru'; userAgent?: string | null; ipHash?: string | null; consent: true; client?: 'web' | 'app' },
  now = new Date(),
) {
  if (input.consent !== true) throw new DomainError('CONSENT_REQUIRED');
  const id = crypto.randomUUID();
  const token = randomToken(24);
  const browserSecret = randomToken(24);
  const matchCode = randomMatchCode();
  const expiresAt = addMinutes(now, LOGIN_TTL_MINUTES);
  await db
    .prepare(`INSERT INTO login_requests(id, token_hash, browser_hash, match_code, status, return_to, locale, user_agent, ip_hash, created_at, expires_at, consent_at, consent_version, client)
      VALUES (?1, ?2, ?3, ?4, 'PENDING', ?5, ?6, ?7, ?8, ?9, ?10, ?9, ?11, ?12)`)
    .bind(
      id,
      await sha256Hex(token),
      await sha256Hex(browserSecret),
      matchCode,
      safeReturnPath(input.returnTo, '/account'),
      input.locale,
      input.userAgent?.slice(0, 300) ?? null,
      input.ipHash ?? null,
      toDbTime(now),
      toDbTime(expiresAt),
      PRIVACY_VERSION,
      input.client ?? 'web',
    )
    .run();
  return { id, token, browserSecret, matchCode, expiresAt };
}

export function loginCookieValue(id: string, browserSecret: string) {
  return `${id}.${browserSecret}`;
}

/**
 * Browser polling. Returns the approved user exactly once: the APPROVED →
 * CONSUMED transition is conditional, so two concurrent polls cannot both
 * open a session.
 */
export async function pollLogin(db: D1Database, cookieValue: string | null, now = new Date()): Promise<
  { status: 'MISSING' } | { status: Exclude<LoginStatus, 'APPROVED' | 'CONSUMED'>; matchCode: string } | { status: 'APPROVED'; userId: string; returnTo: string }
> {
  const [id, secret] = (cookieValue ?? '').split('.');
  if (!id || !secret) return { status: 'MISSING' };
  const row = await db.prepare(`SELECT ${COLUMNS} FROM login_requests WHERE id = ?1`).bind(id).first<LoginRequestRow>();
  if (!row || row.browserHash !== (await sha256Hex(secret))) return { status: 'MISSING' };
  if (row.status === 'CONSUMED') return { status: 'MISSING' };
  if (row.status === 'APPROVED' && row.userId) {
    const consumed = await db
      .prepare(`UPDATE login_requests SET status = 'CONSUMED', consumed_at = ?2 WHERE id = ?1 AND status = 'APPROVED'`)
      .bind(row.id, toDbTime(now))
      .run();
    if ((consumed.meta.changes ?? 0) !== 1) return { status: 'MISSING' };
    return { status: 'APPROVED', userId: row.userId, returnTo: safeReturnPath(row.returnTo, '/account') };
  }
  if ((row.status === 'PENDING' || row.status === 'WAITING') && row.expiresAt <= toDbTime(now)) {
    return { status: 'EXPIRED', matchCode: row.matchCode };
  }
  return { status: row.status as Exclude<LoginStatus, 'APPROVED' | 'CONSUMED'>, matchCode: row.matchCode };
}

export type AttachResult =
  | { kind: 'expired' }
  | { kind: 'taken' }
  | { kind: 'ok'; request: LoginRequestRow; knownUser: UserRecord | null };

/** `/start <token>` in the bot binds the request to this Telegram user. */
export async function attachTelegram(
  db: D1Database,
  input: { token: string; telegramUserId: string; chatId: string },
  now = new Date(),
): Promise<AttachResult> {
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM login_requests WHERE token_hash = ?1`)
    .bind(await sha256Hex(input.token))
    .first<LoginRequestRow>();
  if (!row || !isOpen(row, now)) return { kind: 'expired' };
  if (row.telegramUserId && row.telegramUserId !== input.telegramUserId) return { kind: 'taken' };
  const updated = await db
    .prepare(`UPDATE login_requests SET status = 'WAITING', telegram_user_id = ?2, telegram_chat_id = ?3
      WHERE id = ?1 AND status IN ('PENDING', 'WAITING') AND (telegram_user_id IS NULL OR telegram_user_id = ?2)`)
    .bind(row.id, input.telegramUserId, input.chatId)
    .run();
  if ((updated.meta.changes ?? 0) !== 1) return { kind: 'taken' };
  const knownUser = await getUserByTelegramId(db, input.telegramUserId);
  return { kind: 'ok', request: { ...row, status: 'WAITING', telegramUserId: input.telegramUserId, telegramChatId: input.chatId }, knownUser };
}

async function latestWaiting(db: D1Database, telegramUserId: string, now: Date) {
  return db
    .prepare(`SELECT ${COLUMNS} FROM login_requests
      WHERE telegram_user_id = ?1 AND status = 'WAITING' AND expires_at > ?2
      ORDER BY created_at DESC LIMIT 1`)
    .bind(telegramUserId, toDbTime(now))
    .first<LoginRequestRow>();
}

/** Approves the request and records its privacy consent on the account, atomically. */
async function approve(db: D1Database, requestId: string, userId: string, now: Date) {
  const nowDb = toDbTime(now);
  const [approved] = await db.batch([
    db.prepare(`UPDATE login_requests SET status = 'APPROVED', user_id = ?2, approved_at = ?3
      WHERE id = ?1 AND status = 'WAITING' AND expires_at > ?3 AND consent_at IS NOT NULL`)
      .bind(requestId, userId, nowDb),
    db.prepare(`UPDATE users SET
        privacy_accepted_at = (SELECT consent_at FROM login_requests WHERE id = ?2),
        privacy_version = (SELECT consent_version FROM login_requests WHERE id = ?2)
      WHERE id = ?1 AND EXISTS (SELECT 1 FROM login_requests WHERE id = ?2 AND user_id = ?1 AND status = 'APPROVED' AND approved_at = ?3)`)
      .bind(userId, requestId, nowDb),
  ]);
  return (approved.meta.changes ?? 0) === 1;
}

export type ApproveResult = { kind: 'approved'; user: UserRecord; request: LoginRequestRow } | { kind: 'expired' } | { kind: 'blocked'; request: LoginRequestRow };

/** A new user shares their own contact: the phone is verified by Telegram. */
export async function approveWithContact(
  db: D1Database,
  identity: TelegramIdentity,
  adminPhones: string[],
  now = new Date(),
): Promise<ApproveResult> {
  const request = await latestWaiting(db, identity.telegramUserId, now);
  // No account is created for a request started without consent.
  if (!request?.consentAt) return { kind: 'expired' };
  const user = await upsertTelegramUser(db, { ...identity, locale: request.locale === 'ru' ? 'ru' : 'uz' }, adminPhones, now);
  if (user.status !== 'ACTIVE') return { kind: 'blocked', request };
  return (await approve(db, request.id, user.id, now)) ? { kind: 'approved', user, request } : { kind: 'expired' };
}

/** A returning user confirms with the inline button. */
export async function approveKnown(db: D1Database, input: { requestId: string; telegramUserId: string }, now = new Date()): Promise<ApproveResult> {
  const request = await db.prepare(`SELECT ${COLUMNS} FROM login_requests WHERE id = ?1`).bind(input.requestId).first<LoginRequestRow>();
  if (!request?.consentAt || request.telegramUserId !== input.telegramUserId || !isOpen(request, now)) return { kind: 'expired' };
  const user = await getUserByTelegramId(db, input.telegramUserId);
  if (!user || !user.phone) return { kind: 'expired' };
  if (user.status !== 'ACTIVE') return { kind: 'blocked', request };
  await db.prepare(`UPDATE users SET last_login_at = ?2 WHERE id = ?1`).bind(user.id, toDbTime(now)).run();
  return (await approve(db, request.id, user.id, now)) ? { kind: 'approved', user, request } : { kind: 'expired' };
}

export async function denyLogin(db: D1Database, input: { telegramUserId: string; requestId?: string }, now = new Date()) {
  const request = input.requestId
    ? await db.prepare(`SELECT ${COLUMNS} FROM login_requests WHERE id = ?1`).bind(input.requestId).first<LoginRequestRow>()
    : await latestWaiting(db, input.telegramUserId, now);
  if (!request || request.telegramUserId !== input.telegramUserId) return null;
  await db
    .prepare(`UPDATE login_requests SET status = 'DENIED' WHERE id = ?1 AND status IN ('PENDING', 'WAITING')`)
    .bind(request.id)
    .run();
  return request;
}
