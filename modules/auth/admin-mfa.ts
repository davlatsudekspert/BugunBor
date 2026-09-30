import { randomToken, sha256Hex } from '@/lib/crypto';
import { parseDbTime, toDbTime } from '@/lib/time';
import { DomainError } from '@/modules/errors';
import { enforceRateLimit } from '@/modules/rate-limit';
import type { SessionUser } from './sessions';
import { authenticatorUri, matchingTotpStep, newTotpSecret } from './totp';

const SETUP_MINUTES = 10;
const ADMIN_HOURS = 12;
const ATTEMPTS = { limit: 5, windowSeconds: 600 };
type Factor = { user_id: string; secret_encrypted: string; setup_session_id: string; setup_expires_at: string; enabled_at: string | null; last_step: number };

export function isAdminOwner(user: Pick<SessionUser, 'adminOwner' | 'role'> | null) {
  return Boolean(user?.adminOwner && user.role === 'ADMIN');
}

export function assertAdminOwner(user: SessionUser) {
  if (!isAdminOwner(user) || user.authMethod !== 'telegram') throw new DomainError('FORBIDDEN');
}

export function adminSetupNeedsLogin(user: SessionUser, enabled: boolean, now = new Date()) {
  const age = now.getTime() - parseDbTime(user.createdAt).getTime();
  return user.authMethod !== 'telegram' || !enabled && (!Number.isFinite(age) || age < 0 || age > SETUP_MINUTES * 60_000);
}

function assertFreshLogin(user: SessionUser, now: Date) {
  assertAdminOwner(user);
  const age = now.getTime() - parseDbTime(user.createdAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age > SETUP_MINUTES * 60_000) throw new DomainError('UNAUTHENTICATED');
}

export async function adminSessionVerified(db: D1Database, user: SessionUser, now = new Date()) {
  if (!isAdminOwner(user) || user.authMethod !== 'telegram') return false;
  const since = toDbTime(new Date(now.getTime() - ADMIN_HOURS * 3_600_000));
  const row = await db.prepare(`SELECT s.id FROM sessions s JOIN admin_mfa m ON m.user_id = s.user_id
    WHERE s.id = ?1 AND s.user_id = ?2 AND s.auth_method = 'telegram' AND s.revoked_at IS NULL
      AND s.expires_at > ?3 AND s.admin_verified_at > ?4 AND s.admin_verified_at <= ?3 AND m.enabled_at IS NOT NULL`)
    .bind(user.sessionId, user.id, toDbTime(now), since).first();
  return Boolean(row);
}

// AES-GCM binds the encrypted seed to this account. Never use the development fallback.
async function encryptionKey(secret: string) {
  if (secret.length < 32 || secret === 'bugunbor-default-hash-secret') throw new DomainError('SERVER', 503);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`bugunbor:admin-mfa:v1:${secret}`));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
async function encrypt(seed: string, userId: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) }, await encryptionKey(secret), new TextEncoder().encode(seed));
  return `${b64(iv)}.${b64(new Uint8Array(encrypted))}`;
}
async function decrypt(encrypted: string, userId: string, secret: string) {
  const [iv, data] = encrypted.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: new TextEncoder().encode(userId) }, await encryptionKey(secret), unb64(data)));
}
export async function factorEnabled(db: D1Database, userId: string) {
  return Boolean(await db.prepare('SELECT user_id FROM admin_mfa WHERE user_id = ?1 AND enabled_at IS NOT NULL').bind(userId).first());
}
async function limit(db: D1Database, userId: string, ipHash: string, action: string, now: Date) {
  await enforceRateLimit(db, `admin-mfa:${action}:user:${userId}`, ATTEMPTS, now);
  await enforceRateLimit(db, `admin-mfa:${action}:ip:${ipHash}`, ATTEMPTS, now);
}

/** Only a fresh Telegram login can begin enrollment. Another session cannot steal an active setup. */
export async function beginAdminSetup(db: D1Database, user: SessionUser, hashSecret: string, ipHash: string, now = new Date()) {
  assertFreshLogin(user, now);
  await limit(db, user.id, ipHash, 'setup', now);
  const seed = newTotpSecret();
  const encrypted = await encrypt(seed, user.id, hashSecret);
  const expires = toDbTime(new Date(now.getTime() + SETUP_MINUTES * 60_000));
  const result = await db.prepare(`INSERT INTO admin_mfa(user_id, secret_encrypted, setup_session_id, setup_expires_at)
    VALUES (?1, ?2, ?3, ?4) ON CONFLICT(user_id) DO UPDATE SET
      secret_encrypted = excluded.secret_encrypted, setup_session_id = excluded.setup_session_id,
      setup_expires_at = excluded.setup_expires_at, last_step = -1
    WHERE admin_mfa.enabled_at IS NULL AND admin_mfa.setup_expires_at <= ?5`)
    .bind(user.id, encrypted, user.sessionId, expires, toDbTime(now)).run();
  if ((result.meta.changes ?? 0) !== 1) {
    const pending = await db.prepare(`SELECT * FROM admin_mfa WHERE user_id = ?1 AND enabled_at IS NULL
      AND setup_session_id = ?2 AND setup_expires_at > ?3`).bind(user.id, user.sessionId, toDbTime(now)).first<Factor>();
    if (!pending) throw new DomainError('FORBIDDEN');
    return { uri: authenticatorUri(await decrypt(pending.secret_encrypted, user.id, hashSecret)), expiresAt: pending.setup_expires_at };
  }
  return { uri: authenticatorUri(seed), expiresAt: expires };
}

export async function verifyAdminFactor(db: D1Database, user: SessionUser, code: string, hashSecret: string, ipHash: string, now = new Date()) {
  assertAdminOwner(user);
  await limit(db, user.id, ipHash, 'verify', now);
  const factor = await db.prepare('SELECT * FROM admin_mfa WHERE user_id = ?1').bind(user.id).first<Factor>();
  if (!factor) throw new DomainError('FORBIDDEN');
  const nowDb = toDbTime(now);
  const enrolling = !factor.enabled_at;
  if (enrolling) {
    assertFreshLogin(user, now);
    if (factor.setup_session_id !== user.sessionId || factor.setup_expires_at <= nowDb) throw new DomainError('FORBIDDEN');
  }
  const seed = await decrypt(factor.secret_encrypted, user.id, hashSecret);
  const step = await matchingTotpStep(seed, code, now);
  if (step === null || step <= factor.last_step) throw new DomainError('FORBIDDEN');
  // The replay counter and session elevation happen in one D1 transaction.
  const recoveryCodes = enrolling ? Array.from({ length: 10 }, () => randomToken(18)) : [];
  const recoveryHashes = await Promise.all(recoveryCodes.map((value) => sha256Hex(value)));
  const [used, elevated] = await db.batch([
    db.prepare(`UPDATE admin_mfa SET last_step = ?2, enabled_at = COALESCE(enabled_at, ?3)
      WHERE user_id = ?1 AND last_step < ?2 AND secret_encrypted = ?4
        AND EXISTS (SELECT 1 FROM sessions WHERE id = ?5 AND user_id = ?1 AND auth_method = 'telegram' AND revoked_at IS NULL AND expires_at > ?3)`)
      .bind(user.id, step, nowDb, factor.secret_encrypted, user.sessionId),
    db.prepare(`UPDATE sessions SET admin_verified_at = ?3 WHERE id = ?1 AND user_id = ?2
      AND revoked_at IS NULL AND expires_at > ?3 AND changes() = 1`)
      .bind(user.sessionId, user.id, nowDb),
    ...recoveryHashes.map((hash) => db.prepare(`INSERT INTO admin_recovery_codes(user_id, code_hash)
      SELECT ?1, ?2 WHERE changes() = 1`)
      .bind(user.id, hash)),
  ]);
  if ((used.meta.changes ?? 0) !== 1 || (elevated.meta.changes ?? 0) !== 1) throw new DomainError('FORBIDDEN');
  return { recoveryCodes };
}

export async function verifyAdminRecovery(db: D1Database, user: SessionUser, code: string, ipHash: string, now = new Date()) {
  assertAdminOwner(user);
  await limit(db, user.id, ipHash, 'verify', now);
  const nowDb = toDbTime(now);
  const [used, elevated] = await db.batch([
    db.prepare(`UPDATE admin_recovery_codes SET used_at = ?3 WHERE user_id = ?1 AND code_hash = ?2 AND used_at IS NULL
      AND EXISTS (SELECT 1 FROM admin_mfa WHERE user_id = ?1 AND enabled_at IS NOT NULL)
      AND EXISTS (SELECT 1 FROM sessions WHERE id = ?4 AND user_id = ?1 AND auth_method = 'telegram' AND revoked_at IS NULL AND expires_at > ?3)`)
      .bind(user.id, await sha256Hex(code), nowDb, user.sessionId),
    db.prepare(`UPDATE sessions SET admin_verified_at = ?3 WHERE id = ?1 AND user_id = ?2 AND changes() = 1
      AND revoked_at IS NULL AND expires_at > ?3`).bind(user.sessionId, user.id, nowDb),
  ]);
  if ((used.meta.changes ?? 0) !== 1 || (elevated.meta.changes ?? 0) !== 1) throw new DomainError('FORBIDDEN');
}
