import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSession, getSessionUser } from '@/modules/auth/sessions';
import { createReport } from '@/modules/reports';
import { NOW, marketplace } from '@/test/fixtures';

// The owner's admin panel in the app: the queue, people, and decisions.

const state = vi.hoisted(() => ({ db: null as unknown as D1Database }));
vi.mock('@/db/client', () => ({ getDb: async () => state.db }));
vi.mock('@/modules/auth/admin-owner', () => ({ isOwnerPhone: async (phone: string | null) => phone === '+998900000001' }));

const { GET: queue } = await import('./queue/route');
const { GET: users } = await import('./users/route');
const { POST: act } = await import('./actions/route');

const req = (path: string, token?: string, body?: unknown) =>
  new Request(`https://bugunbor.uz${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
type Row = Record<string, unknown> & { id: string; role?: string; status?: string };
type Queue = { businesses: Row[]; deals: Row[]; reports: Row[]; messages: Row[] };
const read = async (response: Response) => ({ status: response.status, body: (await response.json()) as { data: Queue & Row[]; error?: { code: string } } });

let owner: string;
beforeEach(async () => {
  state.db = await marketplace();
  await state.db.prepare(`UPDATE users SET role = 'ADMIN', telegram_user_id = '100', phone_verified_at = '2026-09-01 10:00:00' WHERE id = 'owner'`).run();
  owner = (await createSession(state.db, 'owner', { authMethod: 'telegram', client: 'app' }, NOW)).token;
  await state.db.batch([
    state.db.prepare(`INSERT INTO businesses(id, slug, name, description, city, category_id, phone, verification_status, search_text, submitted_at)
      VALUES ('newbiz', 'yangi', 'Yangi kafe', 'Tekshiruvni kutyapti', 'tashkent', 'cat_food', '+998712000009', 'PENDING', 'yangi kafe', '2026-09-25 09:00:00')`),
    state.db.prepare(`INSERT INTO business_members(business_id, user_id, role) VALUES ('newbiz', 'stranger', 'OWNER')`),
    state.db.prepare(`INSERT INTO contact_messages(id, name, contact, subject, message) VALUES ('msg1', 'Ali', '+998901112233', 'Savol', 'Qanday qo‘shiladi?')`),
  ]);
  await createReport(state.db, { reporterId: 'alice', targetType: 'DEAL', targetId: 'deal', reason: 'WRONG_INFO', comment: 'Narx boshqa' }, NOW);
});

describe('the app admin panel', () => {
  it('is for the owner only', async () => {
    expect((await read(await queue(req('/api/v1/admin/queue')))).status).toBe(401);
    const alice = (await createSession(state.db, 'alice', { authMethod: 'telegram', client: 'app' }, NOW)).token;
    expect((await read(await queue(req('/api/v1/admin/queue', alice)))).status).toBe(403);
    expect((await read(await users(req('/api/v1/admin/users?q=a', alice)))).status).toBe(403);
    expect((await read(await act(req('/api/v1/admin/actions', alice, { type: 'business.decide', businessId: 'newbiz', decision: 'APPROVE' })))).status).toBe(403);
  });

  it('lists what waits, and the owner decides each kind', async () => {
    const before = (await read(await queue(req('/api/v1/admin/queue', owner)))).body.data;
    expect(before.businesses).toEqual([expect.objectContaining({ id: 'newbiz', name: 'Yangi kafe', city: 'tashkent', ownerName: 'Stranger', branches: 0 })]);
    expect(before.reports).toEqual([expect.objectContaining({ targetType: 'DEAL', reason: 'WRONG_INFO', comment: 'Narx boshqa', title: 'Osh', count: 1 })]);
    expect(before.messages).toEqual([expect.objectContaining({ id: 'msg1', name: 'Ali', subject: 'Savol' })]);
    expect(before.deals).toEqual([]);

    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'business.decide', businessId: 'newbiz', decision: 'APPROVE' })))).body.data).toEqual({ status: 'VERIFIED' });
    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'report.resolve', reportId: before.reports[0].id, status: 'RESOLVED' })))).status).toBe(200);
    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'message.status', messageId: 'msg1', status: 'READ' })))).status).toBe(200);
    const after = (await read(await queue(req('/api/v1/admin/queue', owner)))).body.data;
    expect(after).toEqual({ businesses: [], deals: [], reports: [], messages: [] });
    // A rejection needs a reason.
    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'deal.decide', dealId: 'deal', decision: 'REJECT' })))).status).toBeGreaterThanOrEqual(400);
  });

  it('finds people, changes a role, blocks (sessions end) and unblocks; never the owner, never to admin', async () => {
    const found = (await read(await users(req('/api/v1/admin/users?q=Alice', owner)))).body.data;
    expect(found).toEqual([expect.objectContaining({ id: 'alice', name: 'Alice Karimova', role: 'CUSTOMER', status: 'ACTIVE' })]);

    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'user.update', userId: 'bob', role: 'MODERATOR' })))).status).toBe(200);
    const alice = await createSession(state.db, 'alice', { authMethod: 'telegram', client: 'app' }, NOW);
    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'user.update', userId: 'alice', status: 'BLOCKED' })))).status).toBe(200);
    expect(await getSessionUser(state.db, alice.token, new Date(NOW.getTime() + 1000))).toBeNull();
    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'user.update', userId: 'alice', status: 'ACTIVE' })))).status).toBe(200);
    const list = (await read(await users(req('/api/v1/admin/users', owner)))).body.data;
    expect(list.find((u) => u.id === 'bob')?.role).toBe('MODERATOR');
    expect(list.find((u) => u.id === 'alice')?.status).toBe('ACTIVE');

    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'user.update', userId: 'owner', status: 'BLOCKED' })))).body.error?.code).toBe('SELF_ACTION');
    expect((await read(await act(req('/api/v1/admin/actions', owner, { type: 'user.update', userId: 'bob', role: 'ADMIN' })))).status).toBe(422);
  });
});
