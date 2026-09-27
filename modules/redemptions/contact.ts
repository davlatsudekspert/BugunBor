import { toDbTime } from '@/lib/time';
import { auditStatement } from '@/modules/audit';
import { DomainError } from '@/modules/errors';

// A business talks to a person who booked a code without ever seeing their
// phone number: a ready message ("we are waiting", "it takes a little
// longer") or a cancellation with its reason ("sold out", "closed"). The
// person gets it on Telegram or in the app at once; a cancelled booking's
// unit goes back to the pool. Each message is sent at most once per booking.

export const BOOKING_MESSAGES = ['WAITING', 'DELAY'] as const;
export const BOOKING_CANCEL_REASONS = ['OUT_OF_STOCK', 'CLOSED'] as const;
export type BookingMessage = (typeof BOOKING_MESSAGES)[number];
export type BookingCancelReason = (typeof BOOKING_CANCEL_REASONS)[number];

/** The booking as it stands, or the error that says why nothing can be done. */
async function activeBooking(db: D1Database, businessId: string, redemptionId: string, now: Date) {
  const code = await db
    .prepare(`SELECT id, user_id AS userId, status, expires_at AS expiresAt FROM redemptions WHERE id = ?1 AND business_id = ?2`)
    .bind(redemptionId, businessId)
    .first<{ id: string; userId: string; status: string; expiresAt: string }>();
  if (!code) throw new DomainError('CODE_NOT_FOUND');
  if (code.status === 'COMPLETED') throw new DomainError('CODE_USED');
  if (code.status === 'CANCELED') throw new DomainError('CODE_CANCELED');
  if (code.status !== 'CLAIMED' || code.expiresAt <= toDbTime(now)) throw new DomainError('CODE_EXPIRED');
  return code;
}

/** Sends one of the ready messages; `sent` is false when it had been sent before. */
export async function messageBooking(
  db: D1Database,
  input: { businessId: string; staffUserId: string; redemptionId: string; message: BookingMessage },
  now = new Date(),
) {
  const code = await activeBooking(db, input.businessId, input.redemptionId, now);
  const nowDb = toDbTime(now);
  const results = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at)
        VALUES (lower(hex(randomblob(16))), ?1, 'BOOKING_MESSAGE', 'BOOKING_MESSAGE:' || ?2 || ':' || ?3, json_object('redemptionId', ?2, 'message', ?3), ?4, ?4)`)
      .bind(code.userId, code.id, input.message, nowDb),
    auditStatement(db, { actorUserId: input.staffUserId, businessId: input.businessId, action: 'redemption.messaged', targetType: 'Redemption', targetId: code.id, after: { message: input.message } }, nowDb),
  ]);
  return { sent: (results[0].meta.changes ?? 0) === 1 };
}

/** Cancels an active booking with its reason; the person is told and the unit returns. */
export async function cancelBooking(
  db: D1Database,
  input: { businessId: string; staffUserId: string; redemptionId: string; reason: BookingCancelReason },
  now = new Date(),
) {
  const code = await activeBooking(db, input.businessId, input.redemptionId, now);
  const nowDb = toDbTime(now);
  const eventId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`UPDATE redemptions SET status = 'CANCELED', canceled_at = ?2, updated_at = ?2, cancel_reason = ?4
        WHERE id = ?1 AND business_id = ?3 AND status = 'CLAIMED' AND expires_at > ?2`)
      .bind(code.id, nowDb, input.businessId, input.reason),
    db.prepare(`INSERT OR IGNORE INTO redemption_events(id, redemption_id, actor_user_id, type, metadata_json, created_at)
        SELECT ?1, ?2, ?3, 'CANCELED', json_object('by', 'business', 'reason', ?4), ?5 WHERE EXISTS (SELECT 1 FROM redemptions WHERE id = ?2 AND status = 'CANCELED')`)
      .bind(eventId, code.id, input.staffUserId, input.reason, nowDb),
    db.prepare(`UPDATE deals SET remaining_quantity = remaining_quantity + 1, updated_at = ?2
        WHERE id = (SELECT deal_id FROM redemptions WHERE id = ?1) AND remaining_quantity IS NOT NULL
          AND (total_quantity IS NULL OR remaining_quantity < total_quantity)
          AND EXISTS (SELECT 1 FROM redemption_events WHERE id = ?3)`)
      .bind(code.id, nowDb, eventId),
    db.prepare(`INSERT OR IGNORE INTO notifications(id, user_id, kind, dedupe_key, payload_json, send_after, created_at)
        SELECT lower(hex(randomblob(16))), ?1, 'BOOKING_CANCELED', 'BOOKING_CANCELED:' || ?2, json_object('redemptionId', ?2), ?3, ?3
        WHERE EXISTS (SELECT 1 FROM redemption_events WHERE id = ?4)`)
      .bind(code.userId, code.id, nowDb, eventId),
    auditStatement(db, { actorUserId: input.staffUserId, businessId: input.businessId, action: 'redemption.canceled_by_business', targetType: 'Redemption', targetId: code.id, reason: input.reason, before: { status: 'CLAIMED' }, after: { status: 'CANCELED' } }, nowDb),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('CONFLICT');
}

/** The ready messages already sent about each of these bookings (by their unique keys). */
export async function sentMessages(db: D1Database, redemptionIds: string[]) {
  const sent = new Map<string, BookingMessage[]>();
  if (!redemptionIds.length) return sent;
  const keys = redemptionIds.flatMap((id) => BOOKING_MESSAGES.map((message) => `BOOKING_MESSAGE:${id}:${message}`));
  const rows = await db
    .prepare(`SELECT dedupe_key AS key FROM notifications WHERE dedupe_key IN (SELECT value FROM json_each(?1))`)
    .bind(JSON.stringify(keys))
    .all<{ key: string }>();
  for (const { key } of rows.results) {
    const [, id, message] = key.split(':');
    sent.set(id, [...(sent.get(id) ?? []), message as BookingMessage]);
  }
  return sent;
}
