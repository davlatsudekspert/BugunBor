import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMigrations } from '@/db/migrate';
import { createTestD1 } from '@/test/d1';
import { toDbTime } from '@/lib/time';

// Dummy owner phone; production uses only the approved owner's fingerprint.
vi.mock('./admin-owner', () => ({ isOwnerPhone: async (phone: string | null) => phone === '+998900000001' }));
import { adminSessionVerified, beginAdminSetup, factorEnabled, verifyAdminFactor, verifyAdminRecovery } from './admin-mfa';
import { createSession, getSessionUser, type SessionUser } from './sessions';
import { apiAdmin, apiModerator } from './api-user';
import { upsertTelegramUser } from './users';
import { updateUser } from '@/modules/admin/service';
import { processNotifications, staffAlertStatement } from '@/modules/notifications/service';
import { matchingTotpStep, totpCode } from './totp';

const now = new Date('2026-09-30T07:00:00Z');
const secret = 'test-only-encryption-key-at-least-32-characters';
afterEach(() => vi.useRealTimers());
let db: D1Database;
let user: SessionUser;
let token: string;
const codeFor = (uri: string, date = now) => totpCode(new URL(uri).searchParams.get('secret')!, Math.floor(date.getTime() / 30_000));

async function enroll() {
  const setup = await beginAdminSetup(db, user, secret, 'ip', now);
  const result = await verifyAdminFactor(db, user, await codeFor(setup.uri), secret, 'ip', now);
  return { ...setup, ...result };
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  db = createTestD1();
  await applyMigrations(db);
  await upsertTelegramUser(db, { telegramUserId: '100', phone: '+998900000001', telegramUsername: null, displayName: 'Test Owner', locale: 'uz' }, [], now);
  const id = await db.prepare("SELECT id FROM users WHERE telegram_user_id = '100'").first<string>('id');
  const session = await createSession(db, id!, { authMethod: 'telegram' }, now);
  token = session.token;
  user = (await getSessionUser(db, token, now))!;
});

describe('single owner and admin MFA', () => {
  it('enforces the owner phone despite any old ADMIN_PHONES list', async () => {
    const outsider = await upsertTelegramUser(db, { telegramUserId: '101', phone: '+998900000002', telegramUsername: null, displayName: 'Other', locale: 'uz' }, ['+998900000002'], now);
    expect(outsider.role).toBe('CUSTOMER');
    await db.prepare("UPDATE users SET role = 'ADMIN' WHERE id = ?1").bind(outsider.id).run();
    const session = await createSession(db, outsider.id, { authMethod: 'telegram' }, now);
    const other = (await getSessionUser(db, session.token, now))!;
    expect(other.role).toBe('CUSTOMER');
    expect(other.adminOwner).toBe(false);
    await expect(beginAdminSetup(db, other, secret, 'other', now)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('requires a fresh Telegram session and a strong encryption key for initial enrollment', async () => {
    await expect(beginAdminSetup(db, user, 'bugunbor-default-hash-secret', 'ip', now)).rejects.toMatchObject({ status: 503 });
    await expect(beginAdminSetup(db, user, secret, 'ip', new Date(now.getTime() + 11 * 60_000))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const old = await createSession(db, user.id, {}, now);
    await expect(beginAdminSetup(db, (await getSessionUser(db, old.token, now))!, secret, 'ip', now)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('encrypts the seed, binds setup to its session, and never reveals an enabled seed', async () => {
    const setup = await beginAdminSetup(db, user, secret, 'ip', now);
    const seed = new URL(setup.uri).searchParams.get('secret')!;
    const stored = await db.prepare('SELECT secret_encrypted FROM admin_mfa WHERE user_id = ?1').bind(user.id).first<string>('secret_encrypted');
    expect(stored).not.toContain(seed);
    expect(await beginAdminSetup(db, user, secret, 'ip', now)).toEqual(setup);
    const other = await createSession(db, user.id, { authMethod: 'telegram' }, now);
    await expect(verifyAdminFactor(db, (await getSessionUser(db, other.token, now))!, await codeFor(setup.uri), secret, 'ip', now)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await verifyAdminFactor(db, user, await codeFor(setup.uri), secret, 'ip', now);
    await expect(beginAdminSetup(db, user, secret, 'ip', now)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('denies all admin API access before MFA and permits only the elevated session afterward', async () => {
    const request = new Request('https://bugunbor.uz/api/v1/admin', { headers: { authorization: `Bearer ${token}` } });
    await expect(apiAdmin(request, db)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(apiModerator(request, db)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await enroll();
    expect(await adminSessionVerified(db, user, now)).toBe(true);
    expect((await apiAdmin(request, db)).id).toBe(user.id);
    expect((await apiModerator(request, db)).id).toBe(user.id);
    const other = await createSession(db, user.id, { authMethod: 'telegram' }, now);
    expect(await adminSessionVerified(db, (await getSessionUser(db, other.token, now))!, now)).toBe(false);
    expect(await adminSessionVerified(db, user, new Date(now.getTime() + 12 * 3_600_000))).toBe(false);
    await db.prepare('UPDATE sessions SET revoked_at = ?2 WHERE id = ?1').bind(user.sessionId, toDbTime(now)).run();
    expect(await adminSessionVerified(db, user, now)).toBe(false);
  });
  it('does not enable MFA on wrong codes, limits attempts, and rejects a reused TOTP', async () => {
    const setup = await beginAdminSetup(db, user, secret, 'ip', now);
    const code = await codeFor(setup.uri);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i++) await expect(verifyAdminFactor(db, user, wrong, secret, 'ip', now)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await factorEnabled(db, user.id)).toBe(false);
    await verifyAdminFactor(db, user, code, secret, 'ip', now);
    await expect(verifyAdminFactor(db, user, code, secret, 'ip', now)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    const later = new Date(now.getTime() + 600_000);
    await expect(verifyAdminFactor(db, user, code, secret, 'ip', later)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('accepts each recovery code once and stores only its hash', async () => {
    const { recoveryCodes } = await enroll();
    expect(recoveryCodes).toHaveLength(10);
    const rows = await db.prepare('SELECT code_hash FROM admin_recovery_codes').all<{ code_hash: string }>();
    expect(rows.results.every((row) => !recoveryCodes.includes(row.code_hash))).toBe(true);
    await verifyAdminRecovery(db, user, recoveryCodes[0], 'ip', now);
    await expect(verifyAdminRecovery(db, user, recoveryCodes[0], 'ip', now)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('rejects replay even when the same valid code is submitted concurrently', async () => {
    const setup = await beginAdminSetup(db, user, secret, 'ip', now);
    const code = await codeFor(setup.uri);
    const results = await Promise.allSettled([verifyAdminFactor(db, user, code, secret, 'ip', now), verifyAdminFactor(db, user, code, secret, 'ip', now)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM admin_recovery_codes').first('n')).toBe(10);
  });
  it('sends private staff alerts only to the verified owner, never a legacy admin', async () => {
    await db.prepare(`INSERT INTO users(id, role, display_name, phone, telegram_user_id, phone_verified_at)
      VALUES ('legacy', 'ADMIN', 'Legacy', '+998900000002', '101', ?1)`).bind(toDbTime(now)).run();
    await db.batch([
      staffAlertStatement(db, { kind: 'PHOTO_CHECK_DOWN', key: 'first', payload: { errors: 'test' }, nowDb: toDbTime(now) }),
    ]);
    const sent: string[] = [];
    await processNotifications(db, { async sendMessage(chatId) { sent.push(String(chatId)); } }, { appUrl: 'https://bugunbor.uz', now });
    expect(sent).toEqual(['100']);
  });
  it('forbids assigning ADMIN through user management', async () => {
    await expect(updateUser(db, { actorId: user.id, userId: 'other', role: 'ADMIN' }, now)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('RFC 6238 TOTP', () => {
  const vectorSeed = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  it.each([[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']])('matches the published RFC vector at %s', async (seconds, code) => {
    expect(await totpCode(vectorSeed, Math.floor(Number(seconds) / 30), 8)).toBe(code);
  });
  it('allows one step of clock drift and rejects malformed or stale codes', async () => {
    const step = Math.floor(now.getTime() / 30_000);
    expect(await matchingTotpStep(vectorSeed, await totpCode(vectorSeed, step - 1), now)).toBe(step - 1);
    expect(await matchingTotpStep(vectorSeed, 'abc123', now)).toBeNull();
    expect(await matchingTotpStep(vectorSeed, await totpCode(vectorSeed, step - 4), now)).toBeNull();
  });
});
