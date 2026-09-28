import { describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { migrations } from '@/db/migrations';
import { createTestD1 } from '@/test/d1';
import { NOW, marketplace } from '@/test/fixtures';
import { SYSTEM_MODERATOR_ID, decideBusiness, setBusinessBadge } from './service';

// The public «Tasdiqlangan biznes» mark is a person's decision: the automatic
// approval that puts a business on the site within seconds does not give it.

const errorCode = async (promise: Promise<unknown>) => promise.then(() => 'OK', (error: { code?: string }) => error.code ?? 'UNKNOWN');
const badge = (db: D1Database, id: string) =>
  db.prepare(`SELECT badge_verified_at AS at, badge_verified_by AS by FROM businesses WHERE id = ?1`).bind(id).first<{ at: string | null; by: string | null }>();

async function pending(db: D1Database, id: string, extra = '') {
  await db
    .prepare(`INSERT INTO businesses(id, slug, name, description, city, category_id, verification_status, search_text${extra ? ', is_demo' : ''})
      VALUES (?1, ?1, ?1, 'Tavsif', 'tashkent', 'cat_food', 'PENDING', ?1${extra ? ', 1' : ''})`)
    .bind(id)
    .run();
}

describe('the «Tasdiqlangan biznes» mark', () => {
  it('comes with a moderator’s approval, not with the automatic one, and goes with a rejection', async () => {
    const db = await marketplace();
    await pending(db, 'by-person');
    await pending(db, 'by-system');
    await decideBusiness(db, { actorId: 'mod', businessId: 'by-person', decision: 'APPROVE', reason: '' }, NOW);
    await decideBusiness(db, { actorId: SYSTEM_MODERATOR_ID, businessId: 'by-system', decision: 'APPROVE', reason: 'Avtomatik tekshiruv' }, NOW);
    expect(await badge(db, 'by-person')).toEqual({ at: expect.any(String), by: 'mod' });
    expect(await badge(db, 'by-system')).toEqual({ at: null, by: null });
  });

  it('a moderator gives it to an approved business and takes it back; never to a sample or one in review', async () => {
    const db = await marketplace();
    await setBusinessBadge(db, { actorId: 'mod', businessId: 'biz', on: true }, NOW);
    expect(await badge(db, 'biz')).toEqual({ at: expect.any(String), by: 'mod' });
    await setBusinessBadge(db, { actorId: 'mod', businessId: 'biz', on: false }, NOW);
    expect(await badge(db, 'biz')).toEqual({ at: null, by: null });
    const audit = await db.prepare(`SELECT action FROM audit_logs WHERE business_id = 'biz' ORDER BY rowid`).all<{ action: string }>();
    expect(audit.results.map((row) => row.action)).toEqual(['business.badge.granted', 'business.badge.removed']);

    await pending(db, 'waiting');
    expect(await errorCode(setBusinessBadge(db, { actorId: 'mod', businessId: 'waiting', on: true }, NOW))).toBe('INVALID_TRANSITION');
    await pending(db, 'sample', 'demo');
    await db.prepare(`UPDATE businesses SET verification_status = 'VERIFIED' WHERE id = 'sample'`).run();
    expect(await errorCode(setBusinessBadge(db, { actorId: 'mod', businessId: 'sample', on: true }, NOW))).toBe('INVALID_TRANSITION');
    expect(await errorCode(setBusinessBadge(db, { actorId: 'mod', businessId: 'missing', on: true }, NOW))).toBe('NOT_FOUND');
  });

  it('after the upgrade, only businesses a person approved keep a mark', async () => {
    const db = createTestD1();
    await applyMigrations(db, migrations.filter((migration) => migration.id < '0015'));
    await db.batch([
      db.prepare(`INSERT INTO users(id, role, display_name) VALUES ('mod', 'MODERATOR', 'Moderator')`),
      ...['by-person', 'by-system', 'sample'].map((id) =>
        db.prepare(`INSERT INTO businesses(id, slug, name, description, city, verification_status, search_text, is_demo) VALUES (?1, ?1, ?1, 'Tavsif', 'tashkent', 'VERIFIED', ?1, ?2)`)
          .bind(id, id === 'sample' ? 1 : 0)),
      db.prepare(`INSERT INTO moderation_actions(id, actor_user_id, target_type, target_id, action, reason, before_json, after_json, created_at) VALUES
        ('m1', 'mod', 'Business', 'by-person', 'APPROVE', 'Approved', '{}', '{}', '2026-09-20 10:00:00'),
        ('m2', ?1, 'Business', 'by-system', 'APPROVE', 'Avtomatik tekshiruv', '{}', '{}', '2026-09-21 10:00:00'),
        ('m3', 'mod', 'Business', 'sample', 'APPROVE', 'Approved', '{}', '{}', '2026-09-21 10:00:00')`).bind(SYSTEM_MODERATOR_ID),
    ]);
    await applyMigrations(db);
    expect(await badge(db, 'by-person')).toEqual({ at: '2026-09-20 10:00:00', by: 'mod' });
    expect(await badge(db, 'by-system')).toEqual({ at: null, by: null });
    expect(await badge(db, 'sample')).toEqual({ at: null, by: null });
  });
});
