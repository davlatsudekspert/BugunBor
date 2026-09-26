import { beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '@/db/migrate';
import { runMaintenance } from '@/modules/redemptions/service';
import { createTestD1 } from '@/test/d1';
import { RETENTION, yearsBefore } from './retention';

const NOW = new Date('2031-09-26T08:00:00Z');

describe('retention cleanup', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = createTestD1();
    await applyMigrations(db);
  });

  it('keeps the audit trail, moderation history and contact messages for five years', async () => {
    expect(RETENTION.logYears).toBe(5);
    await db.batch([
      db.prepare(`INSERT INTO audit_logs(id, action, target_type, target_id, created_at) VALUES ('old', 'x', 'User', 'u', '2026-09-25 07:59:59'), ('new', 'x', 'User', 'u', '2026-09-26 08:00:01')`),
      db.prepare(`INSERT INTO moderation_actions(id, actor_user_id, target_type, target_id, action, reason, before_json, after_json, created_at)
        VALUES ('old', 'usr_system', 'Deal', 'd', 'APPROVE', 'r', '{}', '{}', '2026-09-25 07:59:59'), ('new', 'usr_system', 'Deal', 'd', 'APPROVE', 'r', '{}', '{}', '2026-09-26 08:00:01')`),
      db.prepare(`INSERT INTO contact_messages(id, name, contact, subject, message, created_at) VALUES ('old', 'A', '+998', 's', 'm', '2026-09-25 07:59:59'), ('new', 'A', '+998', 's', 'm', '2026-09-26 08:00:01')`),
    ]);
    await runMaintenance(db, NOW, true);
    for (const table of ['audit_logs', 'moderation_actions', 'contact_messages']) {
      const ids = await db.prepare(`SELECT id FROM ${table} WHERE id IN ('old', 'new') ORDER BY id`).all<{ id: string }>();
      expect(ids.results.map((row) => row.id), table).toEqual(['new']);
    }
  });

  it('counts years by the calendar', () => {
    expect(yearsBefore(new Date('2031-09-26T08:00:00Z'), 5).toISOString()).toBe('2026-09-26T08:00:00.000Z');
    expect(yearsBefore(new Date('2032-02-29T00:00:00Z'), 1).toISOString()).toBe('2031-03-01T00:00:00.000Z');
  });
});
