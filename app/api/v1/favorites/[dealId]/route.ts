import { getDb } from '@/db/client';
import { assertSameOrigin, json, route } from '@/lib/http';
import { toDbTime } from '@/lib/time';
import { apiUser } from '@/modules/auth/current';
import { DomainError } from '@/modules/errors';
import { RATE_RULES, enforceRateLimit } from '@/modules/rate-limit';

type Context = { params: Promise<{ dealId: string }> };

export const PUT = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  await enforceRateLimit(db, `write:${user.id}`, RATE_RULES.write);
  const { dealId } = await context.params;
  const deal = await db.prepare(`SELECT id FROM deals WHERE id = ?1 AND deleted_at IS NULL`).bind(dealId).first();
  if (!deal) throw new DomainError('NOT_FOUND');
  await db.prepare(`INSERT OR IGNORE INTO favorites(user_id, deal_id, created_at) VALUES (?1, ?2, ?3)`).bind(user.id, dealId, toDbTime(new Date())).run();
  return json({ data: { saved: true } });
});

export const DELETE = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const db = await getDb();
  const user = await apiUser(request, db);
  const { dealId } = await context.params;
  await db.prepare(`DELETE FROM favorites WHERE user_id = ?1 AND deal_id = ?2`).bind(user.id, dealId).run();
  return json({ data: { saved: false } });
});
