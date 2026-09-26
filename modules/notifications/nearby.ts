import { toDbTime } from '@/lib/time';

// "A new deal you may like, near you": sent to customers who chose the deal's
// category as an interest, switched on nearby alerts, and whose rough
// notification area (~1 km grid) or city matches one of the deal's branches.
// Followers already get NEW_DEAL, blocked businesses never notify, at most
// three a day per person, and nothing is sent at night.

export const NEARBY = { maxPerDay: 3, radiusKm: 5, quietFrom: 22, quietUntil: 8 } as const;

const TASHKENT_OFFSET_MS = 5 * 60 * 60_000;

/** The moment to send: now, or 08:00 Tashkent time when it is night there. */
export function daytimeSendAfter(at: Date) {
  const local = new Date(at.getTime() + TASHKENT_OFFSET_MS);
  const hour = local.getUTCHours();
  if (hour >= NEARBY.quietUntil && hour < NEARBY.quietFrom) return at;
  const morning = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), NEARBY.quietUntil) - TASHKENT_OFFSET_MS);
  return hour >= NEARBY.quietFrom ? new Date(morning.getTime() + 24 * 60 * 60_000) : morning;
}

// 1° of latitude ≈ 111 km; the stored area is lat/lng × 100 (≈1 km grid).
const LAT_STEPS = Math.ceil((NEARBY.radiusKm / 111) * 100);
const LNG_STEPS = Math.ceil((NEARBY.radiusKm / 84) * 100);

export function interestDealStatement(db: D1Database, input: { dealId: string; sendAfter: Date; nowDb: string }) {
  const sendAfter = toDbTime(daytimeSendAfter(input.sendAfter));
  return db
    .prepare(`INSERT OR IGNORE INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at)
      SELECT lower(hex(randomblob(16))), u.id, 'INTEREST_DEAL', 'INTEREST_DEAL:' || ?1 || ':' || u.id, json_object('dealId', ?1), ?2, ?3
      FROM deals d JOIN user_interests i ON i.category_id = d.category_id JOIN users u ON u.id = i.user_id
      WHERE d.id = ?1 AND d.status = 'ACTIVE' AND d.is_demo = 0
        AND u.status = 'ACTIVE' AND u.notify_nearby = 1
        AND (u.telegram_user_id IS NOT NULL OR EXISTS (SELECT 1 FROM devices dv WHERE dv.user_id = u.id))
        AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.user_id = u.id AND f.business_id = d.business_id)
        AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE ub.user_id = u.id AND ub.business_id = d.business_id)
        AND EXISTS (
          SELECT 1 FROM deal_branches db JOIN branches br ON br.id = db.branch_id AND br.deleted_at IS NULL
          WHERE db.deal_id = d.id AND (
            (u.notify_lat_e2 IS NOT NULL
              AND ABS(br.latitude_e6 / 10000 - u.notify_lat_e2) <= ${LAT_STEPS}
              AND ABS(br.longitude_e6 / 10000 - u.notify_lng_e2) <= ${LNG_STEPS})
            OR (u.notify_lat_e2 IS NULL AND u.notify_city = br.city)))
        AND (SELECT COUNT(*) FROM notifications n WHERE n.user_id = u.id AND n.kind = 'INTEREST_DEAL'
          AND n.created_at > strftime('%Y-%m-%d %H:%M:%S', ?3, '-1 day')) < ${NEARBY.maxPerDay}`)
    .bind(input.dealId, sendAfter, input.nowDb);
}
