import { canAccessBusiness, type BusinessAction, type BusinessRole } from '@/modules/auth/authorization';

export type OwnedBusiness = { id: string; verificationStatus: string; role: BusinessRole };

/** The business the caller manages with the given role grant, via their most recent active membership. */
export async function getOwnedBusiness(db: D1Database, userId: string, action: BusinessAction = 'deal.write'): Promise<OwnedBusiness | null> {
  const membership = await db
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
