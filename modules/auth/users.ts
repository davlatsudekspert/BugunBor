import { auditStatement } from '@/modules/audit';
import { toDbTime } from '@/lib/time';

export type PlatformRole = 'CUSTOMER' | 'MODERATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'DELETED';

export type UserRecord = {
  id: string;
  role: PlatformRole;
  displayName: string;
  phone: string | null;
  locale: string;
  status: UserStatus;
  telegramUserId: string | null;
};

export const USER_COLUMNS = `id, role, display_name AS displayName, phone, locale, status, telegram_user_id AS telegramUserId`;

export async function getUserById(db: D1Database, id: string) {
  return db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?1`).bind(id).first<UserRecord>();
}

export async function getUserByTelegramId(db: D1Database, telegramUserId: string) {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE telegram_user_id = ?1 AND status != 'DELETED'`)
    .bind(telegramUserId)
    .first<UserRecord>();
}

export async function getUserByPhone(db: D1Database, phone: string) {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE phone = ?1 AND status != 'DELETED'`)
    .bind(phone)
    .first<UserRecord>();
}

export type TelegramIdentity = {
  telegramUserId: string;
  telegramUsername: string | null;
  phone: string;
  displayName: string;
  locale: 'uz' | 'ru';
};

/**
 * Resolves the BugunBor user for a Telegram-verified phone number:
 * 1. the account already linked to this Telegram user;
 * 2. else the account with this phone, if it is not linked to another Telegram user;
 * 3. else a new account. When the phone belongs to an account linked to a
 *    different Telegram user (a recycled number), the phone moves to the new
 *    account so the new owner never inherits someone else's history.
 * Phones listed in ADMIN_PHONES are promoted to ADMIN.
 */
export async function upsertTelegramUser(db: D1Database, identity: TelegramIdentity, adminPhones: string[], now: Date): Promise<UserRecord> {
  const nowDb = toDbTime(now);
  const shouldBeAdmin = adminPhones.includes(identity.phone);
  const byTelegram = await getUserByTelegramId(db, identity.telegramUserId);
  const byPhone = await getUserByPhone(db, identity.phone);
  const phoneTakenByOther = byPhone && byPhone.id !== byTelegram?.id;
  const existing =
    byTelegram ?? (byPhone && (byPhone.telegramUserId === null || byPhone.telegramUserId === identity.telegramUserId) ? byPhone : null);

  const statements: D1PreparedStatement[] = [];
  if (phoneTakenByOther && byPhone && byPhone.id !== existing?.id) {
    statements.push(
      db.prepare(`UPDATE users SET phone = NULL, updated_at = ?2 WHERE id = ?1`).bind(byPhone.id, nowDb),
      auditStatement(db, { actorUserId: null, action: 'user.phone_reassigned', targetType: 'User', targetId: byPhone.id, reason: 'Phone verified by another Telegram account' }, nowDb),
    );
  }

  if (!existing) {
    const id = `usr_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const role: PlatformRole = shouldBeAdmin ? 'ADMIN' : 'CUSTOMER';
    statements.push(
      db.prepare(`INSERT INTO users(id, role, phone, display_name, locale, status, phone_verified_at, telegram_user_id, telegram_username, last_login_at, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, 'ACTIVE', ?6, ?7, ?8, ?6, ?6, ?6)`)
        .bind(id, role, identity.phone, identity.displayName, identity.locale, nowDb, identity.telegramUserId, identity.telegramUsername),
      auditStatement(db, { actorUserId: id, action: 'user.registered', targetType: 'User', targetId: id, after: { role, via: 'telegram' } }, nowDb),
    );
    await db.batch(statements);
    return (await getUserById(db, id))!;
  }

  const role: PlatformRole = shouldBeAdmin ? 'ADMIN' : existing.role;
  statements.push(
    db.prepare(`UPDATE users SET phone = ?2, phone_verified_at = ?3, telegram_user_id = ?4, telegram_username = ?5,
        role = ?6, last_login_at = ?3, updated_at = ?3 WHERE id = ?1`)
      .bind(existing.id, identity.phone, nowDb, identity.telegramUserId, identity.telegramUsername, role),
  );
  if (role !== existing.role) {
    statements.push(auditStatement(db, { actorUserId: null, action: 'user.role_bootstrap', targetType: 'User', targetId: existing.id, before: { role: existing.role }, after: { role }, reason: 'ADMIN_PHONES' }, nowDb));
  }
  await db.batch(statements);
  return (await getUserById(db, existing.id))!;
}
