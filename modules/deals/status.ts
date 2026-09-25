import { toDbTime } from '@/lib/time';

export type StoredDealStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'ARCHIVED';

/** What people see. ACTIVE is split by time and stock; the rest are shown as stored. */
export type EffectiveDealStatus = Exclude<StoredDealStatus, 'ACTIVE'> | 'SCHEDULED' | 'LIVE' | 'SOLD_OUT' | 'EXPIRED';

export function effectiveDealStatus(
  deal: { status: string; startsAt: string; endsAt: string; remainingQuantity: number | null },
  now = new Date(),
): EffectiveDealStatus {
  if (deal.status !== 'ACTIVE') return deal.status as EffectiveDealStatus;
  const nowDb = toDbTime(now);
  if (deal.endsAt <= nowDb) return 'EXPIRED';
  if (deal.startsAt > nowDb) return 'SCHEDULED';
  if (deal.remainingQuantity !== null && deal.remainingQuantity <= 0) return 'SOLD_OUT';
  return 'LIVE';
}

/** Platform rules from docs/TIZIM.md §5. */
export const DEAL_RULES = {
  minDiscountPercent: 10,
  minDurationMinutes: 30,
  maxDurationDays: 30,
  maxQuantity: 10_000,
  maxPerCustomer: 10,
  claimTtlOptions: [30, 60, 120, 240] as const,
  defaultClaimTtl: 120,
};

export function discountPercent(originalPrice: number, price: number) {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * SQL condition (aliases d = deals, b = businesses) for deals customers may
 * claim right now. D1 only supports numbered parameters, so the caller passes
 * the placeholder that holds the current time, e.g. `liveDealSql('?1')`.
 */
export function liveDealSql(nowParam: string) {
  return `d.status = 'ACTIVE' AND d.deleted_at IS NULL
  AND d.starts_at <= ${nowParam} AND d.ends_at > ${nowParam}
  AND (d.remaining_quantity IS NULL OR d.remaining_quantity > 0)
  AND b.verification_status = 'VERIFIED' AND b.suspended_at IS NULL AND b.deleted_at IS NULL
  AND ${subscriptionActiveSql(nowParam)}`;
}

/** A business is on air during its free trial or a paid period (aliases b = businesses). */
export function subscriptionActiveSql(nowParam: string) {
  return `(b.trial_ends_at > ${nowParam} OR b.paid_until > ${nowParam})`;
}

/** Businesses customers may see (aliases b = businesses). */
export const PUBLIC_BUSINESS_SQL = `b.verification_status = 'VERIFIED' AND b.suspended_at IS NULL AND b.deleted_at IS NULL`;
