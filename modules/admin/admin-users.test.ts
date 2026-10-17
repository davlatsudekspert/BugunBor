import { describe, expect, it } from 'vitest';

import { NOW, marketplace } from '@/test/fixtures';
import { growthStats, listAdminUsers, updateUser } from './service';
import { createSession, getSessionUser } from '@/modules/auth/sessions';

// The overview numbers and the user list the owner works from.

const day = 86_400_000;
const at = (offset: number) => new Date(NOW.getTime() + offset);

async function adminDb() {
  const db = await marketplace();
  await db.prepare(`INSERT INTO users(id, role, display_name, locale, created_at) VALUES ('admin', 'ADMIN', 'Admin', 'uz', ?1)`).bind('2026-08-01 08:00:00').run();
  return db;
}

describe('admin overview numbers', () => {
  it('counts sign-ups by period, roles and objects, with a 14-day chart', async () => {
    const db = await adminDb();
    await db.batch([
      db.prepare(`INSERT INTO users(id, role, display_name, locale, created_at) VALUES ('new1', 'CUSTOMER', 'Yangi 1', 'uz', ?1), ('new2', 'CUSTOMER', 'Yangi 2', 'uz', ?2), ('old', 'CUSTOMER', 'Eski', 'uz', ?3)`)
        .bind('2026-09-24 10:00:00', '2026-09-20 10:00:00', '2026-08-10 10:00:00'),
    ]);
    await createSession(db, 'alice', { userAgent: 'test' }, NOW);
    const stats = await growthStats(db, NOW);
    expect(stats.newUsers7).toBeGreaterThanOrEqual(2);
    expect(stats.newUsers30).toBeGreaterThanOrEqual(stats.newUsers7);
    expect(stats.signedIn).toBe(1);
    expect(stats.roles).toMatchObject({ MODERATOR: 1, ADMIN: 1 });
    expect(stats.roles.CUSTOMER).toBeGreaterThanOrEqual(5);
    expect(stats.objects).toMatchObject({ businesses: 2, deals: 1, codes: 0 });
    expect(stats.days).toHaveLength(14);
    expect(stats.days.at(-1)!.day).toBe('2026-09-25');
    expect(stats.days.find((entry) => entry.day === '2026-09-24')!.users).toBe(1);
    expect(stats.days.every((entry) => entry.codes === 0)).toBe(true);
  });
});

describe('admin user list and actions', () => {
  it('searches by name and phone, and treats % and _ as plain letters', async () => {
    const db = await adminDb();
    await db.prepare(`INSERT INTO users(id, role, display_name, locale) VALUES ('pct', 'CUSTOMER', '100% Ali', 'uz'), ('und', 'CUSTOMER', 'Ali_Vali', 'uz')`).run();
    const names = async (query: string | null) => (await listAdminUsers(db, query)).map((user) => user.displayName);
    expect(await names('Alice')).toEqual(['Alice Karimova']);
    expect(await names('%')).toEqual(['100% Ali']);
    expect(await names('_')).toEqual(['Ali_Vali']);
    expect(await names('Ali%')).toEqual([]);
    expect(await names('+998 90 123 45 67')).toEqual(['Alice Karimova']);
  });

  it('changes a role, blocks and unblocks; a blocked person loses their sessions; admins stay out of reach', async () => {
    const db = await adminDb();
    await updateUser(db, { actorId: 'admin', userId: 'bob', role: 'MODERATOR' }, NOW);
    expect(await db.prepare(`SELECT role FROM users WHERE id = 'bob'`).first()).toEqual({ role: 'MODERATOR' });

    const session = await createSession(db, 'alice', { userAgent: 'test' }, NOW);
    expect(await getSessionUser(db, session.token, at(1000))).toMatchObject({ id: 'alice' });
    await updateUser(db, { actorId: 'admin', userId: 'alice', status: 'BLOCKED' }, NOW);
    expect(await getSessionUser(db, session.token, at(2000))).toBeNull();
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'alice' AND revoked_at IS NULL`).first()).toEqual({ n: 0 });
    await updateUser(db, { actorId: 'admin', userId: 'alice', status: 'ACTIVE' }, at(3000));
    expect(await db.prepare(`SELECT status FROM users WHERE id = 'alice'`).first()).toEqual({ status: 'ACTIVE' });

    await expect(updateUser(db, { actorId: 'admin', userId: 'admin', status: 'BLOCKED' }, NOW)).rejects.toMatchObject({ code: 'SELF_ACTION' });
    await expect(updateUser(db, { actorId: 'admin', userId: 'bob', role: 'ADMIN' }, NOW)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('the chart window', () => {
  it('shows days oldest first, ending today', async () => {
    const db = await adminDb();
    const stats = await growthStats(db, new Date(NOW.getTime() + 3 * day));
    expect(stats.days[0].day).toBe('2026-09-15');
    expect(stats.days.at(-1)!.day).toBe('2026-09-28');
  });
});
