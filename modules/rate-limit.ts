import { DomainError } from '@/modules/errors';
import { sha256Hex } from '@/lib/crypto';

export type RateRule = { limit: number; windowSeconds: number };

export const RATE_RULES = {
  loginStart: { limit: 10, windowSeconds: 600 },
  loginPoll: { limit: 400, windowSeconds: 600 },
  claim: { limit: 10, windowSeconds: 60 },
  redeemLookup: { limit: 30, windowSeconds: 600 },
  contact: { limit: 5, windowSeconds: 600 },
  dealView: { limit: 120, windowSeconds: 600 },
  write: { limit: 60, windowSeconds: 60 },
} satisfies Record<string, RateRule>;

/** Fixed-window counter stored in D1. Returns the count including this hit. */
export async function hitRateLimit(db: D1Database, key: string, rule: RateRule, now = new Date()) {
  const windowStart = Math.floor(now.getTime() / 1000 / rule.windowSeconds) * rule.windowSeconds;
  const row = await db
    .prepare(`INSERT INTO rate_limits(key, window_start, count) VALUES (?1, ?2, 1)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
        window_start = excluded.window_start
      RETURNING count`)
    .bind(key, windowStart)
    .first<{ count: number }>();
  const count = row?.count ?? 1;
  return { allowed: count <= rule.limit, count };
}

export async function enforceRateLimit(db: D1Database, key: string, rule: RateRule, now = new Date()) {
  const { allowed } = await hitRateLimit(db, key, rule, now);
  if (!allowed) throw new DomainError('RATE_LIMITED');
}

export async function hashIp(ip: string, secret: string) {
  return (await sha256Hex(`${secret}:ip:${ip}`)).slice(0, 32);
}
