import { roleCan, type BusinessAction, type BusinessRole } from '@/modules/auth/authorization';
import { DomainError } from '@/modules/errors';

export type Membership = {
  businessId: string;
  role: BusinessRole;
  name: string;
  slug: string;
  city: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  isDemo: boolean;
};

const COLUMNS = `m.business_id AS businessId, m.role, b.name, b.slug, b.city, b.verification_status AS verificationStatus,
  b.rejection_reason AS rejectionReason, b.suspended_at AS suspendedAt, b.suspended_reason AS suspendedReason, b.is_demo AS isDemo`;

export async function listMemberships(db: D1Database, userId: string): Promise<Membership[]> {
  const rows = await db
    .prepare(`SELECT ${COLUMNS} FROM business_members m JOIN businesses b ON b.id = m.business_id
      WHERE m.user_id = ?1 AND m.revoked_at IS NULL AND b.deleted_at IS NULL
      ORDER BY CASE m.role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END, b.created_at`)
    .bind(userId)
    .all<Omit<Membership, 'isDemo'> & { isDemo: number }>();
  return rows.results.map((row) => ({ ...row, isDemo: Boolean(row.isDemo) }));
}

/** Server-side tenant check: the user must be an active member whose role grants the action. */
export async function requireMembership(db: D1Database, userId: string, businessId: string, action: BusinessAction): Promise<Membership> {
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM business_members m JOIN businesses b ON b.id = m.business_id
      WHERE m.user_id = ?1 AND m.business_id = ?2 AND m.revoked_at IS NULL AND b.deleted_at IS NULL`)
    .bind(userId, businessId)
    .first<Omit<Membership, 'isDemo'> & { isDemo: number }>();
  if (!row) throw new DomainError('FORBIDDEN');
  if (!roleCan(row.role, action)) throw new DomainError('FORBIDDEN');
  return { ...row, isDemo: Boolean(row.isDemo) };
}

/** Writes that change what customers see or can claim are blocked while a business is suspended. */
export function assertNotSuspended(membership: Membership) {
  if (membership.suspendedAt) throw new DomainError('BUSINESS_UNAVAILABLE');
}
