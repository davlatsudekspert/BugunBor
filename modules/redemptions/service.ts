import { addMinutes, parseDbTime, toDbTime } from '@/lib/time';
import { auditStatementIf } from '@/modules/audit';
import { DomainError } from '@/modules/errors';
import { deriveRedemptionCode, hashRedemptionCode } from './codes';
import { evaluateClaimPolicy } from './policy';

export type ClaimInput = {
  dealId: string;
  branchId: string;
  userId: string;
  idempotencyKey: string;
  secret: string;
  now?: Date;
};

export type ClaimResult = { id: string; code: string; expiresAt: string; replayed: boolean };

const isConstraintError = (error: unknown) => error instanceof Error && /UNIQUE|constraint/i.test(error.message);

async function existingByKey(db: D1Database, key: string) {
  return db
    .prepare(`SELECT id, user_id AS userId, expires_at AS expiresAt FROM redemptions WHERE idempotency_key = ?1`)
    .bind(key)
    .first<{ id: string; userId: string; expiresAt: string }>();
}

async function activeClaim(db: D1Database, dealId: string, userId: string, now: Date) {
  return db
    .prepare(`SELECT id FROM redemptions WHERE deal_id = ?1 AND user_id = ?2 AND status = 'CLAIMED' AND expires_at > ?3`)
    .bind(dealId, userId, toDbTime(now))
    .first<{ id: string }>();
}

/** Explains why a claim was not inserted, using the same rules as the atomic insert. */
async function diagnoseClaim(db: D1Database, input: ClaimInput, now: Date): Promise<never> {
  const deal = await db
    .prepare(`SELECT d.status, d.starts_at AS startsAt, d.ends_at AS endsAt, d.remaining_quantity AS remainingQuantity,
        d.per_customer_limit AS perCustomerLimit, d.deleted_at AS deletedAt,
        b.verification_status AS verificationStatus, b.suspended_at AS suspendedAt, b.deleted_at AS businessDeletedAt,
        (b.trial_ends_at > ?4 OR b.paid_until > ?4) AS onAir,
        (SELECT COUNT(*) FROM redemptions r WHERE r.deal_id = d.id AND r.user_id = ?2 AND r.status IN ('CLAIMED', 'COMPLETED')) AS existingClaims,
        EXISTS (SELECT 1 FROM deal_branches db JOIN branches br ON br.id = db.branch_id
          WHERE db.deal_id = d.id AND db.branch_id = ?3 AND br.deleted_at IS NULL) AS branchOk
      FROM deals d JOIN businesses b ON b.id = d.business_id WHERE d.id = ?1`)
    .bind(input.dealId, input.userId, input.branchId, toDbTime(now))
    .first<{
      status: string; startsAt: string; endsAt: string; remainingQuantity: number | null; perCustomerLimit: number; deletedAt: string | null;
      verificationStatus: string; suspendedAt: string | null; businessDeletedAt: string | null; onAir: number; existingClaims: number; branchOk: number;
    }>();
  if (!deal || deal.deletedAt) throw new DomainError('NOT_FOUND');
  if (deal.verificationStatus !== 'VERIFIED' || deal.suspendedAt || deal.businessDeletedAt || !deal.onAir) throw new DomainError('BUSINESS_UNAVAILABLE');
  if (await activeClaim(db, input.dealId, input.userId, now)) throw new DomainError('ALREADY_CLAIMED');
  const policy = evaluateClaimPolicy(
    { ...deal, startsAt: parseDbTime(deal.startsAt), endsAt: parseDbTime(deal.endsAt), existingClaims: deal.existingClaims },
    now,
  );
  if (!policy.ok) throw new DomainError(policy.code);
  if (!deal.branchOk) throw new DomainError('BRANCH_UNAVAILABLE');
  throw new DomainError('CONFLICT');
}

/**
 * Claims one unit of a live deal. Every rule is re-checked inside the INSERT
 * and the stock decrement only happens when that INSERT succeeded, all in one
 * D1 batch (a single transaction), so the last unit can never be sold twice.
 */
export async function claimDeal(db: D1Database, input: ClaimInput): Promise<ClaimResult> {
  const now = input.now ?? new Date();
  const nowDb = toDbTime(now);

  const replay = await existingByKey(db, input.idempotencyKey);
  if (replay) {
    if (replay.userId !== input.userId) throw new DomainError('CONFLICT');
    return { id: replay.id, code: await deriveRedemptionCode(input.secret, replay.id), expiresAt: replay.expiresAt, replayed: true };
  }
  if (await activeClaim(db, input.dealId, input.userId, now)) throw new DomainError('ALREADY_CLAIMED');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = crypto.randomUUID();
    const code = await deriveRedemptionCode(input.secret, id);
    const codeHash = await hashRedemptionCode(input.secret, code);
    const inserted = `EXISTS (SELECT 1 FROM redemptions WHERE id = ?1)`;
    let results: D1Result[];
    try {
      results = await db.batch([
        db.prepare(`INSERT INTO redemptions(id, deal_id, business_id, branch_id, user_id, idempotency_key, code_hash, code_hint, status, expires_at, created_at, updated_at)
          SELECT ?1, d.id, d.business_id, ?3, ?4, ?5, ?6, ?7, 'CLAIMED',
            strftime('%Y-%m-%d %H:%M:%S', ?2, '+' || d.claim_ttl_minutes || ' minutes'), ?2, ?2
          FROM deals d JOIN businesses b ON b.id = d.business_id
          WHERE d.id = ?8
            AND d.status = 'ACTIVE' AND d.deleted_at IS NULL AND d.starts_at <= ?2 AND d.ends_at > ?2
            AND (d.remaining_quantity IS NULL OR d.remaining_quantity > 0)
            AND b.verification_status = 'VERIFIED' AND b.suspended_at IS NULL AND b.deleted_at IS NULL
            AND (b.trial_ends_at > ?2 OR b.paid_until > ?2)
            AND EXISTS (SELECT 1 FROM deal_branches db JOIN branches br ON br.id = db.branch_id
              WHERE db.deal_id = d.id AND db.branch_id = ?3 AND br.deleted_at IS NULL)
            AND NOT EXISTS (SELECT 1 FROM redemptions r WHERE r.deal_id = d.id AND r.user_id = ?4 AND r.status = 'CLAIMED')
            AND (SELECT COUNT(*) FROM redemptions r WHERE r.deal_id = d.id AND r.user_id = ?4 AND r.status IN ('CLAIMED', 'COMPLETED')) < d.per_customer_limit`)
          .bind(id, nowDb, input.branchId, input.userId, input.idempotencyKey, codeHash, '', input.dealId),
        db.prepare(`UPDATE deals SET remaining_quantity = remaining_quantity - 1, updated_at = ?2
          WHERE id = ?3 AND remaining_quantity IS NOT NULL AND ${inserted}`)
          .bind(id, nowDb, input.dealId),
        db.prepare(`INSERT INTO redemption_events(id, redemption_id, actor_user_id, type, metadata_json, created_at)
          SELECT ?2, ?1, ?3, 'CLAIMED', ?4, ?5 WHERE ${inserted}`)
          .bind(id, crypto.randomUUID(), input.userId, JSON.stringify({ branchId: input.branchId }), nowDb),
      ]);
    } catch (error) {
      if (!isConstraintError(error)) throw error;
      const raced = await existingByKey(db, input.idempotencyKey);
      if (raced) return claimDeal(db, input);
      if (await activeClaim(db, input.dealId, input.userId, now)) throw new DomainError('ALREADY_CLAIMED');
      continue; // extremely rare code collision: try a fresh id
    }
    if ((results[0].meta.changes ?? 0) !== 1) return diagnoseClaim(db, input, now);
    const row = await db.prepare(`SELECT expires_at AS expiresAt FROM redemptions WHERE id = ?1`).bind(id).first<{ expiresAt: string }>();
    return { id, code, expiresAt: row!.expiresAt, replayed: false };
  }
  throw new DomainError('CONFLICT');
}

/**
 * Writes the single terminal event of a redemption (at most one ever exists,
 * enforced by a unique index) when the preceding UPDATE moved it to `status`.
 * Later statements key their side effects on this event id.
 */
function terminalEvent(db: D1Database, input: { eventId: string; redemptionId: string; actorUserId: string | null; type: 'COMPLETED' | 'CANCELED'; nowDb: string }) {
  return db
    .prepare(`INSERT OR IGNORE INTO redemption_events(id, redemption_id, actor_user_id, type, metadata_json, created_at)
      SELECT ?1, ?2, ?3, ?4, '{}', ?5 WHERE EXISTS (SELECT 1 FROM redemptions WHERE id = ?2 AND status = ?4)`)
    .bind(input.eventId, input.redemptionId, input.actorUserId, input.type, input.nowDb);
}

const eventWritten = `EXISTS (SELECT 1 FROM redemption_events WHERE id = ?11)`;

/** The customer gives up a code; the unit returns to the pool. */
export async function cancelRedemption(db: D1Database, input: { redemptionId: string; userId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const nowDb = toDbTime(now);
  const eventId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`UPDATE redemptions SET status = 'CANCELED', canceled_at = ?2, updated_at = ?2
      WHERE id = ?1 AND user_id = ?3 AND status = 'CLAIMED' AND expires_at > ?2`)
      .bind(input.redemptionId, nowDb, input.userId),
    terminalEvent(db, { eventId, redemptionId: input.redemptionId, actorUserId: input.userId, type: 'CANCELED', nowDb }),
    db.prepare(`UPDATE deals SET remaining_quantity = remaining_quantity + 1, updated_at = ?2
      WHERE id = (SELECT deal_id FROM redemptions WHERE id = ?1) AND remaining_quantity IS NOT NULL
        AND (total_quantity IS NULL OR remaining_quantity < total_quantity)
        AND EXISTS (SELECT 1 FROM redemption_events WHERE id = ?3)`)
      .bind(input.redemptionId, nowDb, eventId),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) throw new DomainError('INVALID_TRANSITION');
}

/** Expires unused codes and returns their units to the pool. Safe to run any time. */
export async function expireStaleRedemptions(db: D1Database, now = new Date()) {
  const nowDb = toDbTime(now);
  const stale = `status = 'CLAIMED' AND expires_at <= ?1`;
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO redemption_events(id, redemption_id, actor_user_id, type, metadata_json, created_at)
      SELECT lower(hex(randomblob(16))), id, NULL, 'EXPIRED', '{}', ?1 FROM redemptions WHERE ${stale}`).bind(nowDb),
    db.prepare(`UPDATE deals SET
        remaining_quantity = MIN(COALESCE(total_quantity, 1000000000),
          remaining_quantity + (SELECT COUNT(*) FROM redemptions r WHERE r.deal_id = deals.id AND r.status = 'CLAIMED' AND r.expires_at <= ?1)),
        updated_at = ?1
      WHERE remaining_quantity IS NOT NULL AND id IN (SELECT deal_id FROM redemptions WHERE ${stale})`).bind(nowDb),
    db.prepare(`UPDATE redemptions SET status = 'EXPIRED', updated_at = ?1 WHERE ${stale}`).bind(nowDb),
  ]);
}

let lastMaintenance = 0;

/** Periodic cleanup, at most once a minute per isolate, triggered by normal traffic. */
export async function runMaintenance(db: D1Database, now = new Date(), force = false) {
  if (!force && now.getTime() - lastMaintenance < 60_000) return;
  lastMaintenance = now.getTime();
  await expireStaleRedemptions(db, now);
  const dayAgo = toDbTime(addMinutes(now, -24 * 60));
  await db.batch([
    db.prepare(`UPDATE login_requests SET status = 'EXPIRED' WHERE status IN ('PENDING', 'WAITING') AND expires_at <= ?1`).bind(toDbTime(now)),
    db.prepare(`DELETE FROM login_requests WHERE expires_at < ?1`).bind(dayAgo),
    db.prepare(`DELETE FROM rate_limits WHERE window_start < ?1`).bind(Math.floor(now.getTime() / 1000) - 86_400),
    db.prepare(`DELETE FROM sessions WHERE expires_at < ?1 OR (revoked_at IS NOT NULL AND revoked_at < ?1)`).bind(dayAgo),
  ]);
}

export type CustomerRedemption = {
  id: string; status: 'CLAIMED' | 'COMPLETED' | 'EXPIRED' | 'CANCELED'; expiresAt: string; createdAt: string;
  completedAt: string | null; dealSlug: string; dealTitle: string; price: number; originalPrice: number | null;
  visual: string | null; categorySlug: string; businessName: string; branchName: string; address: string;
  latitude: number; longitude: number; code: string | null;
};

export async function listCustomerRedemptions(db: D1Database, userId: string, secret: string, now = new Date()) {
  const rows = await db
    .prepare(`SELECT r.id, r.status, r.expires_at AS expiresAt, r.created_at AS createdAt, r.completed_at AS completedAt,
        d.slug AS dealSlug, d.title AS dealTitle, d.discounted_price_uzs AS price, d.original_price_uzs AS originalPrice,
        d.visual, c.slug AS categorySlug, b.name AS businessName, br.name AS branchName, br.address,
        br.latitude_e6 AS lat, br.longitude_e6 AS lon
      FROM redemptions r JOIN deals d ON d.id = r.deal_id JOIN categories c ON c.id = d.category_id
      JOIN businesses b ON b.id = r.business_id JOIN branches br ON br.id = r.branch_id
      WHERE r.user_id = ?1 ORDER BY r.created_at DESC LIMIT 100`)
    .bind(userId)
    .all<Omit<CustomerRedemption, 'code' | 'latitude' | 'longitude'> & { lat: number; lon: number }>();
  const nowDb = toDbTime(now);
  return Promise.all(
    rows.results.map(async ({ lat, lon, ...row }) => {
      const status = row.status === 'CLAIMED' && row.expiresAt <= nowDb ? 'EXPIRED' : row.status;
      return {
        ...row,
        status,
        latitude: lat / 1e6,
        longitude: lon / 1e6,
        code: status === 'CLAIMED' ? await deriveRedemptionCode(secret, row.id) : null,
      } satisfies CustomerRedemption;
    }),
  );
}

export type StaffLookup = {
  id: string; dealTitle: string; price: number; originalPrice: number | null; branchName: string;
  customerName: string; customerPhone: string | null; createdAt: string; expiresAt: string;
};

/** Finds a code for a business. Staff only see the customer's name and a masked phone. */
export async function lookupRedemption(db: D1Database, input: { businessId: string; code: string; secret: string; now?: Date }): Promise<StaffLookup> {
  const now = input.now ?? new Date();
  const row = await db
    .prepare(`SELECT r.id, r.status, r.expires_at AS expiresAt, r.created_at AS createdAt, r.completed_at AS completedAt,
        d.title AS dealTitle, d.discounted_price_uzs AS price, d.original_price_uzs AS originalPrice,
        br.name AS branchName, u.display_name AS customerName, u.phone AS customerPhone
      FROM redemptions r JOIN deals d ON d.id = r.deal_id JOIN branches br ON br.id = r.branch_id JOIN users u ON u.id = r.user_id
      WHERE r.code_hash = ?1 AND r.business_id = ?2`)
    .bind(await hashRedemptionCode(input.secret, input.code), input.businessId)
    .first<StaffLookup & { status: string; completedAt: string | null }>();
  if (!row) throw new DomainError('CODE_NOT_FOUND');
  if (row.status === 'COMPLETED') throw new DomainError('CODE_USED');
  if (row.status === 'CANCELED') throw new DomainError('CODE_CANCELED');
  if (row.status === 'EXPIRED' || row.expiresAt <= toDbTime(now)) throw new DomainError('CODE_EXPIRED');
  const { status: _status, completedAt: _completedAt, ...lookup } = row;
  return lookup;
}

export async function completeRedemption(db: D1Database, input: { businessId: string; redemptionId: string; staffUserId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const nowDb = toDbTime(now);
  const eventId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`UPDATE redemptions SET status = 'COMPLETED', completed_at = ?3, completed_by_user_id = ?4, updated_at = ?3
      WHERE id = ?1 AND business_id = ?2 AND status = 'CLAIMED' AND expires_at > ?3`)
      .bind(input.redemptionId, input.businessId, nowDb, input.staffUserId),
    terminalEvent(db, { eventId, redemptionId: input.redemptionId, actorUserId: input.staffUserId, type: 'COMPLETED', nowDb }),
    auditStatementIf(
      db,
      { actorUserId: input.staffUserId, businessId: input.businessId, action: 'redemption.completed', targetType: 'Redemption', targetId: input.redemptionId },
      nowDb,
      eventWritten,
      eventId,
    ),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) {
    const current = await db.prepare(`SELECT status, expires_at AS expiresAt FROM redemptions WHERE id = ?1 AND business_id = ?2`)
      .bind(input.redemptionId, input.businessId).first<{ status: string; expiresAt: string }>();
    if (!current) throw new DomainError('CODE_NOT_FOUND');
    if (current.status === 'COMPLETED') throw new DomainError('CODE_USED');
    if (current.status === 'CANCELED') throw new DomainError('CODE_CANCELED');
    throw new DomainError('CODE_EXPIRED');
  }
  return { completedAt: nowDb };
}
