import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSession } from '@/modules/auth/sessions';
import { NOW, marketplace } from '@/test/fixtures';

// The owner's numbers for the app: only the owner, signed in with Telegram.

const state = vi.hoisted(() => ({ db: null as unknown as D1Database }));
vi.mock('@/db/client', () => ({ getDb: async () => state.db }));
vi.mock('@/lib/env', () => ({ getConfig: () => ({ stores: { apple: null, play: null } }) }));
// Dummy owner phone (the fixture's "owner"); production knows only the approved owner's fingerprint.
vi.mock('@/modules/auth/admin-owner', () => ({ isOwnerPhone: async (phone: string | null) => phone === '+998900000001' }));

const { GET } = await import('./overview/route');

const req = (token?: string) => new Request('https://bugunbor.uz/api/v1/admin/overview', { headers: token ? { authorization: `Bearer ${token}` } : {} });
const read = async (response: Response) => ({ status: response.status, body: (await response.json()) as { data?: Record<string, unknown>; error?: { code: string } } });

beforeEach(async () => {
  state.db = await marketplace();
  await state.db.prepare(`UPDATE users SET role = 'ADMIN', telegram_user_id = '100', phone_verified_at = ?1 WHERE id = 'owner'`).bind('2026-09-01 10:00:00').run();
});

describe('GET /api/v1/admin/overview', () => {
  it('turns away strangers, customers and the owner without a Telegram sign-in', async () => {
    expect((await read(await GET(req()))).status).toBe(401);
    const alice = await createSession(state.db, 'alice', { authMethod: 'telegram', client: 'app' }, NOW);
    expect(await read(await GET(req(alice.token)))).toMatchObject({ status: 403, body: { error: { code: 'FORBIDDEN' } } });
    const ownerOther = await createSession(state.db, 'owner', { client: 'app' }, NOW);
    expect(await read(await GET(req(ownerOther.token)))).toMatchObject({ status: 403 });
  });

  it('gives the owner the queue, today, people and the 14-day chart', async () => {
    const owner = await createSession(state.db, 'owner', { authMethod: 'telegram', client: 'app' }, NOW);
    const { status, body } = await read(await GET(req(owner.token)));
    expect(status).toBe(200);
    expect(body.data).toMatchObject({
      queue: { businesses: 0, deals: 0, messages: 0, reports: 0, payments: 0 },
      today: { claims: 0, redeemed: 0, liveDeals: expect.any(Number) },
      users: { app30: 1, devices: 0 },
      objects: { businesses: 2, deals: 1, codes: 0 },
      latestBuild: null,
    });
    const users = body.data!.users as Record<string, number>;
    expect(users.total).toBeGreaterThanOrEqual(6);
    expect(users.signedIn).toBe(1);
    expect(body.data!.days).toHaveLength(14);
  });
});
