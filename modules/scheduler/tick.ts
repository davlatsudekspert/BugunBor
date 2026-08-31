import type { getDb } from '@/db/runtime';
import { toStoredUtc } from '@/lib/time';

export type SchedulerTickResult = {
  activated: number;
  expired: number;
  productsSoldOut: number;
  servicesSoldOut: number;
};

/**
 * Section 33 of the product spec ("Auto Scheduler"): the server, not the business,
 * flips deal status as time and inventory cross their thresholds.
 *   SCHEDULED -> ACTIVE   once starts_at is reached
 *   ACTIVE    -> EXPIRED  once ends_at is reached
 *   ACTIVE    -> SOLD_OUT once a PRODUCT's remaining_quantity hits 0, or a SERVICE
 *                          deal has no slot left with remaining_capacity > 0
 *
 * This must run on a recurring trigger (a Railway Cron Job calling
 * POST /api/v1/admin/scheduler/tick, or any external scheduler) — see docs/operations.md.
 */
export async function runSchedulerTick(
  db: ReturnType<typeof getDb>,
): Promise<SchedulerTickResult> {
  const now = toStoredUtc(new Date().toISOString());
  const results = await db.batch([
    db
      .prepare(`UPDATE deals SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'SCHEDULED' AND starts_at <= ?1`)
      .bind(now),
    db
      .prepare(`UPDATE deals SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'ACTIVE' AND ends_at <= ?1`)
      .bind(now),
    db.prepare(`UPDATE deals SET status = 'SOLD_OUT', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'ACTIVE' AND deal_type = 'PRODUCT'
        AND remaining_quantity IS NOT NULL AND remaining_quantity <= 0`),
    db.prepare(`UPDATE deals SET status = 'SOLD_OUT', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'ACTIVE' AND deal_type = 'SERVICE'
        AND NOT EXISTS (SELECT 1 FROM service_slots s WHERE s.deal_id = deals.id AND s.remaining_capacity > 0)`),
  ]);
  return {
    activated: results[0].meta.changes ?? 0,
    expired: results[1].meta.changes ?? 0,
    productsSoldOut: results[2].meta.changes ?? 0,
    servicesSoldOut: results[3].meta.changes ?? 0,
  };
}
