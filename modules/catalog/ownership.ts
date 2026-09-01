import { canAccessBusiness, type BusinessAction, type BusinessRole } from '@/modules/auth/authorization';

export type OwnedBusiness = { id: string; verificationStatus: string; role: BusinessRole };

/**
 * The business the caller manages with the given role grant.
 *
 * Pass `businessId` whenever you already know which of the caller's (possibly several)
 * businesses is meant — a page or request scoped by `?business=`/a body field, or a deal
 * that's already been looked up (see getManagedDeal below). Without it, this falls back to
 * their single most recently joined membership, which is only ever correct for a caller with
 * exactly one business — anyone who manages more than one would have their other business(es)
 * silently inaccessible through this path, so don't rely on the fallback for a caller who
 * might own several.
 */
export async function getOwnedBusiness(db: D1Database, userId: string, action: BusinessAction = 'deal.write', businessId?: string): Promise<OwnedBusiness | null> {
  const membership = businessId
    ? await db
        .prepare(`SELECT bm.business_id AS businessId, bm.role FROM business_members bm WHERE bm.user_id = ?1 AND bm.business_id = ?2 AND bm.revoked_at IS NULL`)
        .bind(userId, businessId)
        .first<{ businessId: string; role: BusinessRole }>()
    : await db
        .prepare(`SELECT bm.business_id AS businessId, bm.role FROM business_members bm WHERE bm.user_id = ?1 AND bm.revoked_at IS NULL ORDER BY bm.created_at DESC LIMIT 1`)
        .bind(userId)
        .first<{ businessId: string; role: BusinessRole }>();
  if (!membership || !canAccessBusiness({ requestedBusinessId: membership.businessId, membershipBusinessId: membership.businessId, role: membership.role, action })) {
    return null;
  }
  const business = await db.prepare('SELECT id, verification_status AS verificationStatus FROM businesses WHERE id = ?1 AND deleted_at IS NULL').bind(membership.businessId).first<{ id: string; verificationStatus: string }>();
  if (!business) return null;
  return { id: business.id, verificationStatus: business.verificationStatus, role: membership.role };
}

export type OwnedBusinessSummary = { id: string; name: string; verificationStatus: string; role: BusinessRole };

/** Every business the caller has an active membership in, most recently joined first — for a
 * dashboard/switcher, so someone who manages more than one business can actually reach all of
 * them instead of only ever the one getOwnedBusiness()'s no-businessId fallback would pick. */
export async function listOwnedBusinesses(db: D1Database, userId: string): Promise<OwnedBusinessSummary[]> {
  const result = await db
    .prepare(`
      SELECT b.id, b.name, b.verification_status AS verificationStatus, bm.role AS role
      FROM business_members bm JOIN businesses b ON b.id = bm.business_id
      WHERE bm.user_id = ?1 AND bm.revoked_at IS NULL AND b.deleted_at IS NULL
      ORDER BY bm.created_at DESC
    `)
    .bind(userId)
    .all<OwnedBusinessSummary>();
  return result.results;
}

export type OwnedDeal = {
  id: string;
  businessId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  originalPriceUzs: number | null;
  discountedPriceUzs: number;
  totalQuantity: number | null;
  remainingQuantity: number | null;
};

/** A deal belonging to the business the caller manages. Returns null if it doesn't exist, is deleted, or belongs to someone else. */
export async function getOwnedDeal(db: D1Database, businessId: string, dealId: string): Promise<OwnedDeal | null> {
  return db
    .prepare(`SELECT id, business_id AS businessId, status, starts_at AS startsAt, ends_at AS endsAt,
      original_price_uzs AS originalPriceUzs, discounted_price_uzs AS discountedPriceUzs,
      total_quantity AS totalQuantity, remaining_quantity AS remainingQuantity
      FROM deals WHERE id = ?1 AND business_id = ?2 AND deleted_at IS NULL`)
    .bind(dealId, businessId)
    .first<OwnedDeal>();
}

/**
 * Resolves a deal a caller can manage by looking up which business actually owns it first,
 * then checking membership against *that* specific business — not getOwnedBusiness()'s
 * fallback (most recently joined membership). That fallback is exactly the bug that made an
 * owner's older business's deals return "Aksiya topilmadi" the moment they joined (or
 * re-onboarded) a second, newer business: dealId already says unambiguously which business
 * is meant, so there's no reason to guess.
 */
export async function getManagedDeal(
  db: D1Database,
  userId: string,
  dealId: string,
  action: BusinessAction,
): Promise<{ business: OwnedBusiness; deal: OwnedDeal } | null> {
  const dealBusiness = await db.prepare(`SELECT business_id AS businessId FROM deals WHERE id = ?1 AND deleted_at IS NULL`).bind(dealId).first<{ businessId: string }>();
  if (!dealBusiness) return null;
  const business = await getOwnedBusiness(db, userId, action, dealBusiness.businessId);
  if (!business) return null;
  const deal = await getOwnedDeal(db, business.id, dealId);
  if (!deal) return null;
  return { business, deal };
}
